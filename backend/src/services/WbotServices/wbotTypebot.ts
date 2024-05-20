import {
  WAMessage,
  proto, WASocket
} from "@laxeder/baileys";
import axios from "axios";
import { isNil} from "lodash";
import mime from "mime-types";
import fs from "fs"

import Queue from "../../models/Queue";
import Setting from "../../models/Setting";
import Ticket from "../../models/Ticket";

import { getBodyMessage, verifyMessage } from "./wbotMessageListener";
import { TypebotService } from "../TypebotService/apiTypebotService";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import SendWhatsAppMedia from "./SendWhatsAppMedia";
import path from "path";
import { Readable } from "stream";


type Session = WASocket & {
  id?: number;
};

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

function delay(t, v) {
  return new Promise(function(resolve) { 
      setTimeout(resolve.bind(null, v), t)
  });
}

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

async function baixarESalvarArquivo(url) {
  try {
    const resposta = await axios({
      url: url,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    // Inferir a extensão com base no tipo de conteúdo
    const extensao = mime.extension(resposta.headers['content-type']) || '.bin';

    const outputFile = `${publicFolder}/${new Date().getTime()}.${extensao}`;
    
    // const arrayDeBytes = new Uint8Array(resposta.data);
    // const buffer = Buffer.from(arrayDeBytes);
    const buffer = Buffer.from(resposta.data);

    // Escrever o Buffer no arquivo
    fs.writeFileSync(outputFile, buffer);
    
    // Criar arquivo Simulado Tipo Multer File para não ter que criar outro envio de media
    const arquivoSimuladoTipoMulterFile = {
      fieldname: 'arquivo',
      originalname: path.basename(outputFile),
      encoding: '7bit',
      mimetype: resposta.headers['content-type'],
      destination: url,
      filename: path.basename(outputFile),
      path: outputFile,
      size: buffer.length,
      buffer: buffer,
      stream: Readable.from(buffer),
    };
    return arquivoSimuladoTipoMulterFile 
        
  } catch (erro) {
    console.error('Erro ao baixar o arquivo:', erro);
    throw new erro;
  }
}
const startChat = async (msgBody, ticket, typebot) => {
  const requestData = await TypebotService.startChat(msgBody,typebot, ticket.companyId)
  const { sessionId } = requestData
  if (sessionId) {
    await ticket.update({ 
      sessiontypebot: sessionId,
      startChatTime: new Date()
    }) 
  }
 
  return requestData
}

const continueChat = async (msgBody, ticket) => {
  return TypebotService.continueChat(msgBody, ticket.sessiontypebot, ticket.companyId)
}
  
const SendMessageReturnTypebot = async (requestData, ticket,resetChatbotMsg, wbot) => {

  const companyId = ticket?.companyId

  const buttonActive = await Setting.findOne({
    where: {
      key: "chatBotType",
      companyId
    }
  });

  const messages = requestData.messages
  for (const message of messages){
      if (message.type === 'text') {
          let formattedText = '';
          for (const richText of message.content.richText){
          for (const element of richText.children){
              let text = '';
              if (element.type === 'inline-variable') {
                for (let i = 0; i < element.children.length; i++) {
                    if (element && element.children && element.children[i]) {
                        text = element.children[i].children[i].text;
                    }
                }
              }
              if (element.text) {
                  text = element.text;
              }
              if (element.bold) {
                  text = `*${text}*`;
              }
              if (element.italic) {
                  text = `_${text}_`;
              }
              if (element.underline) {
                  text = `~${text}~`;
              }
              formattedText += text;          
          }
          formattedText += '\n';
          }
          formattedText = formattedText.replace(/\n$/, '');
          
          await SendWhatsAppMessage({
            body: formattedText,
            ticket,
            quotedMsg: null
          })   
      }
      if (message.type === 'image' || message.type === 'video' || message.type === 'audio') {
          try{
            const media = await baixarESalvarArquivo(message.content.url)
            await SendWhatsAppMedia({
              media,
              ticket,
              body: media.filename
            })
           
          }catch(e){}
      }
  }

  const input = requestData.input
  if (input) {
    if (input.type === 'choice input') {
      let formattedText = '';
      const items = input.items;
      const sectionsRows = []; // Movido para fora do loop para armazenar todas as linhas de seção
  
      for (const item of items) {
        if (buttonActive.value === "list") {
          sectionsRows.push({
            title: item.content,
            rowId: item.content // Se o ID estiver disponível no objeto item, caso contrário, substitua por uma identificação adequada
          });
        } else {
          formattedText += `▶ ${item.content}\n`;
        }
      }
  
      if (buttonActive.value === "list") {
        const sections = [{
          title: `${'Selecione uma das opções a seguir'}`,
          rows: sectionsRows
        }];
  
        const listMessage = {
          text: 'Selecione uma das opções a seguir',
          buttonText: "Escolha uma opção",
          listType: 2,
          sections
        };
  
        const sendMsg = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          listMessage
        );

        await verifyMessage(sendMsg, ticket, ticket.contact);

      } else {
        formattedText = formattedText.replace(/\n$/, '');
        await SendWhatsAppMessage({
          body: formattedText,
          ticket,
          quotedMsg: null
        });
      }
    }
  }

  if (resetChatbotMsg) {
    await SendWhatsAppMessage({
      body: `# - Digite # para retornar ao Menu inicial`,
      ticket,
      quotedMsg: null
     })
  }
}

const handleTypebot = async (ticket: Ticket, msg: WAMessage, queue: Queue, wbot?: Session) => {
  
  let possuiSession: Boolean = true;

  const typebot = queue.publicId
  //const typebot = "pesquisa-de-satisfa";
  
  const timer = ms => new Promise(res => setTimeout(res, ms))
 
  const contentMsgboby = await getBodyMessage(msg)
  
  const rndInt = randomIntFromInterval(1, 3)
  
  await timer(rndInt * 1000)
  
  possuiSession = !isNil(ticket.sessiontypebot)

  if (contentMsgboby == "00") {
    possuiSession = false;

    await ticket.update({ 
      sessiontypebot: null,
      startChatTime: null 
    }) 
  }
  
  const requestTypeBot = possuiSession 
                          ? await continueChat(contentMsgboby, ticket) 
                          : await startChat(contentMsgboby,  ticket, typebot);      
  if (requestTypeBot) {
    delay(2000, await SendMessageReturnTypebot(requestTypeBot, ticket, queue.resetChatbotMsg, wbot))
  }
}

export default handleTypebot;
