import { Request, Response } from "express";
import AppError from "../errors/AppError";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import QuickMessage from "../models/QuickMessage";
import fs from 'fs';
import path from "path";
import * as mime from 'mime';
import { Readable } from 'stream';
import { lookup } from 'mime-types';
import { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";
import ListMessagesService from "../services/MessageServices/ListMessagesService";
import UpdateMessageService from "../services/MessageServices/UpdateMessageService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMediaInternal from "../services/WbotServices/SendWhatsAppMediaInternal";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";

import ShowPlanCompanyService from "../services/CompanyService/ShowPlanCompanyService";


const axios = require("axios");
const FormData = require("form-data");

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  openTicket?: number;
  queueId?: number;
};


export const chamaai = async (req: Request, res: Response): Promise<Response> => {
  
  console.log(req.body);
  console.log(req.body.ticketId);

  const ticketId = req.body.ticketId;

  const updatedMessage = await UpdateMessageService({ ticketId });

  console.log("Update Remoto");

  return res.status(200).json({recebido: "ok"});

};


export const apifinishticket = async (req: Request, res: Response): Promise<Response> => {
  
  //console.log(req.body.companyId);
  //console.log(req.body.ticketId);

  const ticketId = req.body.ticketId;

  const ticket = await Ticket.findByPk(ticketId);
  const finishTicket = await ticket.update({
          queueId: null,
          userId: null,
          status: "closed"
        });

/*
  const io = getIO();

  io.to("open").emit(`company-${ticket.companyId}-ticket`, {
    action: "delete",
    ticket,
    ticketId: ticket.id
  });

  io.to(ticket.status)
    .to(ticket.id.toString())
    .emit(`company-${ticket.companyId}-ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id,
    });
*/
  console.log("Finalização Remota");
  //console.log(finishTicket);

  return res.status(200).json({res: finishTicket});

};

export const apiupdateticket = async (req: Request, res: Response): Promise<Response> => {
  
  console.log(req.body);
  console.log(req.body.ticketId);

  const ticketId = req.body.ticketId;

  console.log("Atualização Remota");

  return res.status(200).json({recebido: "ok"});

};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const { companyId, profile } = req.user;
  const queues: number[] = [];

  if (profile === "user") {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Queue, as: "queues" }]
    });
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues
  });

  SetTicketMessagesAsRead(ticket);

  //console.log("index");

  return res.json({ count, messages, ticket, hasMore });
};

export const ghost = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const { companyId, profile } = req.user;
  const queues: number[] = [];

  if (profile === "user") {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Queue, as: "queues" }]
    });
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues
  });

  //SetTicketMessagesAsRead(ticket);

  //console.log("ghost");

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;

  const originalHeaders = req.headers;

  const pattern = /^\s*\[(.*?)\]$/;
  const patternB = /\s*\*.*?\*/g;

  const checaQuick = body.replace(patternB, '');

  const ticket = await ShowTicketService(ticketId, companyId);
  const matches = pattern.test(checaQuick);

  //console.log("Matches");
  //console.log(matches);
  //console.log("ChecaQuick");
  //console.log(checaQuick);

  SetTicketMessagesAsRead(ticket);

  //console.log(ticket);

  if (matches) {
   
 	const extractedValue = pattern.exec(checaQuick)?.[1];
  	//console.log(extractedValue); 
  
    try {
    	const quickMessage = await QuickMessage.findOne({
      		where: {
        		shortcode: extractedValue,
        		companyId: companyId,
       			userId: req.user.id,
      		},
    	});
    
    	if (quickMessage) {
      		const { mediaPath, mediaName, caption } = quickMessage;
        
            //const filePath = path.resolve(`public/company${companyId}`, mediaPath);
            //const mediaX = await getMessageOptions(mediaName, filePath, companyId.toString());
        
        	const publicFolder = path.resolve(__dirname, "..", "..", "..", "backend/public");
        	const filePath: string = `${publicFolder}/company${companyId}/quick/${mediaPath}`;
            console.log(filePath);
			//const media = fs.readFileSync(filePath);
        	const mimeType: string = lookup(filePath);
            console.log(mimeType);
        
        	const media = {
  				fieldname: 'medias',
  				originalname: mediaName, 
  				mimetype: mimeType,
  				destination: publicFolder,
  				filename: mediaPath, 
  				path: filePath
			};
        
       		if(caption){
        		await SendWhatsAppMediaInternal({ body: caption, media, ticket });
            }else{
            	await SendWhatsAppMediaInternal({ media, ticket });
            }
        		
        
        	/*
        	 try {
            	console.log("aqui");
        		const publicFolder = path.resolve(__dirname, "..", "..", "..", "backend/public");
        		const filePath: string = `${publicFolder}/company${companyId}/${mediaPath}`;
                console.log(filePath);
				const fileData = fs.readFileSync(filePath);
                console.log("passei");
                console.log(fileData);
        
            	const formData = new FormData();
    				formData.append("fromMe", true);
    				formData.append("medias", fileData, {
      				filename: `${mediaPath}`, 
    			});
             
                console.log(formData);
             
              	// Substitua "http://seu-backend.com" pela URL do seu backend
    		  	const backendUrl = `${process.env.BACKEND_URL}/messages/${ticketId}`;
				
             	console.log(backendUrl);
             
    		 	// Substitua "SEU_TICKET_ID" pelo ID correto do ticket
             	// Realiza o POST para o endpoint do backend
             	const result = await axios.post(backendUrl, formData, {
             		headers: originalHeaders,
             	});
             
                console.log(result);

             	console.log(result.data);
             
             } catch (error) {
                console.error("Erro ao fazer o upload:", error.message);
             }
    		*/
            /*
        	const publicFolder = path.resolve(__dirname, "..", "..", "..", "backend/public");
            console.log(publicFolder);
        	const filePath: string = `${publicFolder}/company${companyId}/${mediaPath}`;
            console.log(filePath);
        	const mimeType: string = lookup(filePath);
			console.log(mimeType);
        	const fileData: Buffer = fs.readFileSync(filePath);
        	const fileStream = fs.createReadStream(filePath);
        	const media: Express.Multer.File = {
    			fieldname: 'medias', // Add the appropriate value
    			originalname: mediaName, // Add the appropriate value
    			encoding: '7bit', // Add the appropriate value
    			mimetype: mimeType, // Add the appropriate value
            	destination: publicFolder, // Add the appropriate value
            	filename: mediaPath,
            	path: filePath,
    			size: fileData.length,			
    			buffer: Buffer.alloc(0), // Provide an empty buffer since the file is streamed
    			stream: fileStream
  			};
			//console.log(media);
            
          
			const senting = SendWhatsAppMedia({ body, media, ticket });
			//console.log(senting);
            
            */
        
      	    return res.send();
        	//await SendWhatsAppMedia({ media, ticket });
    	}
    }catch (error) {
    	console.error("Error checking shortcode:", error);
    	return null;
  	}
  
  }
  
  
  

  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        await SendWhatsAppMedia({ media, ticket });
        //console.log(media);
      })
    );
  } else {
    await SendWhatsAppMessage({ body, ticket, quotedMsg });
    //console.log(body);
  }

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  io.of(companyId.toString()).emit(`company-${companyId}-appMessage`, {
    action: "update",
    message
  });

  return res.send();
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params as unknown as { whatsappId: number };
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  //console.log(messageData);
  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    const companyId = whatsapp.companyId;
    const company = await ShowPlanCompanyService(companyId);
    const sendMessageWithExternalApi = company.plan.useExternalApi
    
    if (!sendMessageWithExternalApi) {
        return res.status(400).json({ error: 'API Desabilitada. Entre em contato com o suporte para verificar nossos planos!' });  
    }

    if (!whatsapp) {
      throw new Error("Não foi possível realizar a operação");
    }

    if (messageData.number === undefined) {
      throw new Error("O número é obrigatório");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;
  
    const openTicket = messageData.openTicket;
  
    console.log('Envio via API - Deve abrir ticket? ',openTicket);
  
    const queueId = messageData.queueId;
  
    const CheckValidNumber = await CheckContactNumber(numberToTest, companyId);
    const number = CheckValidNumber.jid.replace(/\D/g, "");
    
    const name = number;
    const profilePicUrl = "";
    const isGroup = false;

    const contactData = {
      name,
      number,
      profilePicUrl,
      isGroup,
      companyId,
    };
  
  
  	const contacto = await CreateOrUpdateContactService(contactData);

  
    

    if (medias) { 
      
    
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          
        if(openTicket.toString() === "1"){
        
        console.log('Envio de API com Mídia e Ticket ',openTicket);
        
          const createTicketMedia = await FindOrCreateTicketService(
      		  contacto,
      		  whatsapp.id,
      		  1,
      		  companyId
    	    );    
        
    	  const ticket = await ShowTicketService(createTicketMedia.id, companyId);
        
          await UpdateTicketService({
                ticketData: { status: "pending", queueId: queueId },
                ticketId: createTicketMedia.id,
                companyId: companyId,
          });
        
          //console.log(body);
        
          if(body){
          
          	await SendWhatsAppMedia({ body, media, ticket });
          
          }else{
          
          	await SendWhatsAppMedia({ media, ticket });
          }       
          //console.log("Abrir Ticket Media");
          //console.log(openTicket);
        
        } else {
        
          //console.log("NÃO Abrir Ticket Media");
          //console.log(openTicket);
          console.log('Envio de API com Mídia SEM Ticket ',openTicket);
          
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                companyId,
                number,
                body: media.originalname,
                mediaPath: media.path
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
         
        }      
        
        
        })
      );
    } else {
		
      if(openTicket.toString() === "1"){
      
        console.log('Envio de API TEXTO e Ticket ',openTicket);
      
        const createTicketText = await FindOrCreateTicketService(
      		contacto,
      		whatsapp.id,
      		1,
      	    companyId
    	  );    
    	const ticket = await ShowTicketService(createTicketText.id, companyId);
      
      	await UpdateTicketService({
                ticketData: { status: "pending", queueId: queueId },
                ticketId: createTicketText.id,
                companyId: companyId,
                
        });
      
	  	await SendWhatsAppMessage({ body, ticket });
      
        //console.log("Abrir Ticket Texto");
        //console.log(openTicket);
      
      } else {
      
      //console.log("Não Abrir Ticket Texto");
      //console.log(openTicket);
      
      console.log('Envio de API TEXTO SEM Ticket ',openTicket);
      
      req.app.get("queues").messageQueue.add(
        "SendMessage",
        {
          whatsappId,
          data: {
            companyId,
            number,
            body
          }
        },

        { removeOnComplete: false, attempts: 3 }

      );
      
      }
    
    }

    return res.send({ mensagem: "Mensagem enviada" });
  } catch (err: any) {
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};
