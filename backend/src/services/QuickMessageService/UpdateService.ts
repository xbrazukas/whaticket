import AppError from "../../errors/AppError";
import QuickMessage from "../../models/QuickMessage";

interface Data {
  shortcode: string;
  message: string;
  userId: number | string;
  id?: number | string;
  geral?: boolean;
  caption?: string;
}

const UpdateService = async (data: Data): Promise<QuickMessage> => {
  const { id, shortcode, message, userId, geral, caption } = data;

  const record = await QuickMessage.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  await record.update({
    shortcode,
    message,
    userId,
    geral,
    caption
  });

  return record;
};

export default UpdateService;
