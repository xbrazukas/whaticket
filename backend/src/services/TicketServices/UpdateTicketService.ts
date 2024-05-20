import moment from "moment";
import * as Sentry from "@sentry/node";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Setting from "../../models/Setting";
import Queue from "../../models/Queue";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { verifyMessage } from "../WbotServices/wbotMessageListener";
import { isNil } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import ShowUserService from "../UserServices/ShowUserService";
import ShowService from "../RatingServices/ShowService";
import User from "../../models/User";


interface TicketData {
  status?: string;
  userId?: number | null;
  queueId?: number | null;
  chatbot?: boolean;
  queueOptionId?: number;
  sendFarewellMessage?: boolean;
  oportunidadeId?: number
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId: number;
  ratingId?: number | undefined;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  companyId,
  ratingId
}: Request): Promise<Response> => {

  //console.log("update ticket service 45");
  //console.log(ticketId);
  //console.log(ticketData);
  //console.log(companyId);

  try {
    const { status, oportunidadeId} = ticketData;
    let { queueId, userId, sendFarewellMessage } = ticketData;
    let chatbot: boolean | null = ticketData.chatbot || false;
    let queueOptionId: number | null = ticketData.queueOptionId || null;

    const io = getIO();

    const setting = await Setting.findOne({
      where: {
        companyId,
        key: "userRating"
      }
    });
  
    let sendFarewellWaitingTicket = await Setting.findOne({
      where: {
        companyId,
        key: "sendFarewellWaitingTicket"
      }
    });

    //console.log(setting.value);
    //console.log("status da rating");

    const enviarMensagemTransferencia = await Setting.findOne({
      where: {
        companyId,
        key: "sendTransferAlert"
      }
    });

    const avaliacaoexterna = await Setting.findOne({
      where: {
        companyId,
        key: "userRatingOut"
      }
    });

    const urldeavaliacao = await Setting.findOne({
      where: {
        companyId,
        key: "ratingurl"
      }
    });

    //console.log(enviarMensagemTransferencia.value);
    //console.log("status da transferencia");

    const ticket = await ShowTicketService(ticketId, companyId);

    //console.log("Ticket Service Linha 76");
    //console.log(ticket);


    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId,
      companyId,
      whatsappId: ticket.whatsappId
    });
    if (!queueId)
    await SetTicketMessagesAsRead(ticket);

    const oldStatus = ticket.status;
    const oldUserId = ticket.user?.id;
    const oldQueueId = ticket.queueId;

    if (oldStatus === "closed") {
      await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
      chatbot = null;
      queueOptionId = null;
    }

  if (status !== undefined && ["closed"].indexOf(status) > -1) {
        const { ratingMessage, complationMessage } = await ShowWhatsAppService(
          ticket.whatsappId,
          companyId
        );

  		if (setting?.value === "enabled" && avaliacaoexterna?.value === "enabled" && urldeavaliacao?.value !== ""){



 			  let messageX = "\u200e";
              messageX += ratingMessage
              messageX += "\r\n";
              messageX += urldeavaliacao?.value;

        	  if (ticket.channel === "whatsapp") {
                const msg = await SendWhatsAppMessage({ body: messageX, ticket });
                // await verifyMessage(msg, ticket, ticket.contact);
              }



              await ticketTraking.update({
                ratingAt: moment().toDate()
              });

              await ticket.update({
          		queueId: null,
          		userId: null,
          		status: "closed"
        	  });

            io.to(`company-${ticket.companyId}-open`)
            .to(`queue-${ticket.queueId}-open`)
            .to(ticketId.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "delete",
              ticketId: ticket.id
            });

              return { ticket, oldStatus, oldUserId };



        }


       if (setting?.value === "enabled" && ratingId && (sendFarewellMessage || sendFarewellMessage === undefined)) {
          if (ticketTraking.ratingAt == null) {
            const rating = await ShowService(ratingId, companyId);
            if (rating) {

              //console.log(rating);


              let { message } = rating;
              message += "\r\n";

              rating.options.sort((a, b) => Number(a.value) - Number(b.value));


              rating.options.forEach(option => {
                message += `\n${option.value} - ${option.name}`;
              });

              if (ticket.channel === "whatsapp") {
                const msg = await SendWhatsAppMessage({ body: message, ticket });
                // await verifyMessage(msg, ticket, ticket.contact);
              }


              await ticketTraking.update({
                ratingAt: moment().toDate()
              });

              await ticket.update({
          		queueId: null,
          		userId: null,
          		status: "closed"
        	  });

            io.to(`company-${ticket.companyId}-open`)
            .to(`queue-${ticket.queueId}-open`)
            .to(ticketId.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "delete",
              ticketId: ticket.id
            });

              return { ticket, oldStatus, oldUserId };
            }
          }
          ticketTraking.ratingAt = moment().toDate();
          ticketTraking.rated = false;
        }

        if((ticket.status !== 'pending') &&  sendFarewellWaitingTicket?.value === 'enabled' && sendFarewellMessage && sendFarewellMessage != undefined){

          const _userId = ticket.userId || userId;

          const user = await User.findByPk(_userId);

          let body: any

          if (user.farewellMessage) {
            body = `\u200e${user.farewellMessage}`;
          } else {
            body = `\u200e${complationMessage}`;
          }
          if (ticket.channel === "whatsapp") {
            await SendWhatsAppMessage({ body, ticket });
          }
        }

        if (!isNil(complationMessage) && complationMessage !== "" && (sendFarewellMessage || sendFarewellMessage === undefined)) {

          const _userId = ticket.userId || userId;

          const user = await User.findByPk(_userId);

          let body: any


          if ((ticket.status !== 'pending') && (ticket.status === 'pending' && sendFarewellWaitingTicket?.value === 'enabled')) {
            if (user.farewellMessage) {
              body = `\u200e${user.farewellMessage}`;
            } else {
              body = `\u200e${complationMessage}`;
            }
            if (ticket.channel === "whatsapp") {
              await SendWhatsAppMessage({ body, ticket });
            }

          }
        }

        ticketTraking.finishedAt = moment().toDate();
        ticketTraking.whatsappId = ticket.whatsappId;
        ticketTraking.userId = ticket.userId;

        if(!isNil(ticket?.contact?.walleteUserId)){
          queueId = ticket?.queueId;
          userId = ticket?.userId;
        }else{
          queueId = ticket?.queueId;
          userId = ticket?.userId;
        }




  }

    if (queueId !== undefined && queueId !== null) {
      ticketTraking.queuedAt = moment().toDate();
    }


  if (enviarMensagemTransferencia?.value === "enabled") {
      // Mensagem de transferencia da FILA
      if (oldQueueId !== queueId && oldUserId === userId && !isNil(oldQueueId) && !isNil(queueId)) {

        const queue = await Queue.findByPk(queueId);
        const wbot = await GetTicketWbot(ticket);
        const msgtxt = "\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o departamento *" + queue?.name + "*\nAguarde um momento, iremos atende-lo(a)!";

        const queueChangedMessage = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: msgtxt
          }
        );
        await verifyMessage(queueChangedMessage, ticket, ticket.contact);
      }
      else
        // Mensagem de transferencia do ATENDENTE
        if (oldUserId !== userId && oldQueueId === queueId && !isNil(oldUserId) && !isNil(userId)) {
          const wbot = await GetTicketWbot(ticket);
          const nome = await ShowUserService(ticketData.userId);
          const msgtxt = "\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o atendente *" + nome.name + "*\nAguarde um momento, iremos atende-lo(a)!";

          const queueChangedMessage = await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            {
              text: msgtxt
            }
          );
          await verifyMessage(queueChangedMessage, ticket, ticket.contact);
        }
        else
          // Mensagem de transferencia do ATENDENTE e da FILA
          if (oldUserId !== userId && !isNil(oldUserId) && !isNil(userId) && oldQueueId !== queueId && !isNil(oldQueueId) && !isNil(queueId)) {
            const wbot = await GetTicketWbot(ticket);
            const queue = await Queue.findByPk(queueId);
            const nome = await ShowUserService(ticketData.userId);
            const msgtxt = "\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o departamento *" + queue?.name + "* e será atendido por *" + nome.name + "*\nAguarde um momento, iremos atende-lo(a)!";

            const queueChangedMessage = await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: msgtxt
              }
            );
            await verifyMessage(queueChangedMessage, ticket, ticket.contact);
          } else
            if (oldUserId !== undefined && isNil(userId) && oldQueueId !== queueId && !isNil(queueId)) {

              const queue = await Queue.findByPk(queueId);
              const wbot = await GetTicketWbot(ticket);
              const msgtxt = "\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o departamento *" + queue?.name + "*\nAguarde um momento, iremos atende-lo(a)!";

              const queueChangedMessage = await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                {
                  text: msgtxt
                }
              );
              await verifyMessage(queueChangedMessage, ticket, ticket.contact);
            }

    }


    await ticket.update({
      status,
      queueId,
      userId,
      whatsappId: ticket.whatsappId,
      chatbot,
      queueOptionId,
      oportunidadeId
    });

    await ticket.reload();

    if (status !== undefined && ["pending"].indexOf(status) > -1) {
      ticketTraking.update({
        whatsappId: ticket.whatsappId,
        queuedAt: moment().toDate(),
        startedAt: null,
        userId: null
      });
      io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ticket`, {
        action: "removeFromList",
        ticketId: ticket?.id
      });
    }

    if (status !== undefined && ["open"].indexOf(status) > -1) {
      ticketTraking.update({
        startedAt: moment().toDate(),
        ratingAt: null,
        rated: false,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId
      });
    }
    
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ticket`, {
      action: "removeFromList",
      ticketId: ticket?.id
    });

    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ticket`, {
      action: "updateUnread",
      ticketId: ticket?.id
    });

    await ticketTraking.save();
    
    if (ticket.status === 'closed' || ticket.user?.id !== oldUserId) {
      io.to(`company-${ticket.companyId}-open`)
      .to(`queue-${ticket.queueId}-open`)
      .to(ticketId.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "delete",
        ticketId: ticket.id
      });
    }
    
    io.to(`company-${companyId}-${ticket.status}`)
    .to(`company-${companyId}-notification`)
    .to(`queue-${ticket.queueId}-${ticket.status}`)
    .to(`queue-${ticket.queueId}-notification`)
    .to(ticketId.toString())
    .to(`user-${ticket?.userId}`)
    .to(`user-${oldUserId}`)
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  
    return { ticket, oldStatus, oldUserId };
  } catch (err) {
    Sentry.captureException(err);
  }
};

export default UpdateTicketService;
