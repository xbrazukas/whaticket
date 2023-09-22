import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Oportunidade from "../../models/Oportunidade";
import ShowService from "./ShowService";


interface RatingData {
  id?: number;
  name: string;
  funil?: string;
  etapadofunil?: string;
  fonte?: string;
  campanha?: string;
  datadeida?: string;
  datadevolta?: string;
  origem?: string;
  destino?: string;
  valor?: string;
  produto?: string; 
}

interface Request {
  ratingData: RatingData;
  id: string | number;
  companyId: number;
}

const UpdateService = async ({
  ratingData,
  id,
  companyId
}: Request): Promise<Oportunidade | undefined> => {
  const rating = await ShowService(id, companyId);

  const schema = Yup.object().shape({
    name: Yup.string().min(3)
  });

  const { name, funil, etapadofunil, fonte, campanha, datadeida, datadevolta, origem, destino, valor, produto } = ratingData;

  try {
    await schema.validate({ name });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new AppError(err.message);
  }


  await rating.update({
    name,
    funil,
    etapadofunil,
    fonte,
    campanha,
    datadeida,
    datadevolta,
    origem,
    destino,
    valor,
    produto
  });

  await rating.reload({
    attributes: ["id", "name", "companyId"]
  });
  return rating;
};

export default UpdateService;
