import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { head } from "lodash";
import fs from "fs";
import path from "path";

import ListService from "../services/CampaignService/ListService";
import CreateService from "../services/CampaignService/CreateService";
import ShowService from "../services/CampaignService/ShowService";
import UpdateService from "../services/CampaignService/UpdateService";
import DeleteService from "../services/CampaignService/DeleteService";
import FindService from "../services/CampaignService/FindService";

import Campaign from "../models/Campaign";

import TicketTag from "../models/TicketTag";
import Ticket from "../models/Ticket";
import Groups from "../models/Groups";
import Contact from "../models/Contact";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";

import AppError from "../errors/AppError";
import { CancelService } from "../services/CampaignService/CancelService";
import { RestartService } from "../services/CampaignService/RestartService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
};

type StoreData = {
  name: string;
  status: string;
  confirmation: boolean;
  scheduledAt: string;
  companyId: number;
  contactListId: number;
  tagListId: number | string;
  groupListId: number | string;
  whatsappId: string;
  tagId: number;
};

type FindParams = {
  companyId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  //console.log(data);

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

   if (typeof data.groupListId === 'number') { 
  
    const groupId = data.groupListId;
    const campanhaNome = data.name;
  
  	async function createContactListFromGroup(groupId) {

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString();
    
        interface Participant {
  			id: string;
  			admin: string | null;
		}

        try {
        
          const userGroups = await Groups.findAll({ where: { id: groupId } });        
          //console.log(userGroups);
          const userGroup = userGroups[0];        
          const participantsJson: Participant[] = userGroup.participantsJson;        
          //console.log(participantsJson);
          
          const randomName = `${campanhaNome} | GRUPO: ${userGroup.subject} - ${formattedDate}` // Implement your own function to generate a random name
          const contactList = await ContactList.create({ name: randomName, companyId: companyId });
          const { id: contactListId } = contactList;
          const contactListItems = participantsJson.map((participant) => ({
  			name: participant.id,
  			number: participant.id.replace(/@s\.whatsapp\.net/g, ""),
  			email: null,
  			contactListId,
  			companyId,
  			isWhatsappValid: true,
		  }));

		  //console.log(contactListItems);

          await ContactListItem.bulkCreate(contactListItems);

          // Return the ContactList ID
          return contactListId;
          
          
          //return;
          
          
        } catch (error) {
          console.error('Error creating contact list:', error);
          throw error;
        }
    }
  
  
  createContactListFromGroup(groupId)
  .then(async (contactListId) => { 
      const record = await CreateService({
        ...data,
        companyId,
        contactListId: contactListId,
      });
      const io = getIO();
     io.emit(`company-${companyId}-campaign`, {
        action: "create",
        record
      });
      return res.status(200).json(record);
    })
    .catch((error) => {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error creating contact list' });
    });
  

  }else{ // SAI DO CHECK DE TAG E GRUPO


    const record = await CreateService({
      ...data,
      companyId
    });

    const io = getIO();
   io.emit(`company-${companyId}-campaign`, {
      action: "create",
      record
    });
  
    //console.log(record);

    return res.status(200).json(record);
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body as StoreData;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    id
  });

  const io = getIO();
 io.emit(`company-${companyId}-campaign`, {
    action: "update",
    record
  });

  return res.status(200).json(record);
};

export const cancel = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  await CancelService(+id);

  return res.status(204).json({ message: "Cancelamento realizado" });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  //await RestartService(+id);

  return res.status(204).json({ message: "Reinício dos disparos" });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
 io.emit(`company-${companyId}-campaign`, {
    action: "delete",
    id
  })

  return res.status(200).json({ message: "Campaign deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const params = req.query as FindParams;
  const records: Campaign[] = await FindService(params);

  return res.status(200).json(records);
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const campaign = await Campaign.findByPk(id);
    campaign.mediaPath = file.filename;
    campaign.mediaName = file.originalname;
    await campaign.save();
    return res.send({ mensagem: "Mensagem enviada" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  try {
    const campaign = await Campaign.findByPk(id);
    const filePath = path.resolve("public", campaign.mediaPath);
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }

    campaign.mediaPath = null;
    campaign.mediaName = null;
    await campaign.save();
    return res.send({ mensagem: "Arquivo excluído" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};