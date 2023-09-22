import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";

interface Request {
  body: string;
  sendAt: string;
  contactId: number | string;
  companyId: number | string;
  userId?: number | string;
  geral?: boolean;
  queueId?: number;
  whatsappId?: number;
}

const CreateService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  geral,
  queueId,
  whatsappId
}: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.string().required()
  });

  try {
    await schema.validate({ body, sendAt });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const schedule = await Schedule.create(
    {
      body,
      sendAt,
      contactId,
      companyId,
      userId,
      status: 'PENDENTE',
      geral,
  	  queueId,
      whatsappId
    }
  );

  await schedule.reload();

  return schedule;
};

export default CreateService;
