import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";

import * as fs from 'fs';
import path from 'path';
import { cwd } from "process";

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
  channel?: string;
  extraInfo?: ExtraInfo[];
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  channel = "whatsapp",
  companyId,
  extraInfo = []
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");

  const clientExtraFieldsPath = path.join(cwd(), "ClientFields.json");

  const clientExtraFieldsData = fs.readFileSync(clientExtraFieldsPath, "utf-8");

  const updatedExtraInfo = [...extraInfo, ...clientExtraFieldsData];

  const io = getIO();
  let contact: Contact | null;

  contact = await Contact.findOne({
    where: {
      number,
      companyId
    }
  });

  if (contact) {

    console.log("ja existe");

    contact.update({ profilePicUrl });

    if (isGroup) {
      contact.update({ name });
    }

    io.emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });
  } else {

    console.log("novo");

    console.log(updatedExtraInfo);

    contact = await Contact.create(
    {
      name,
      number,
      profilePicUrl,
      email,
      isGroup,
      extraInfo: updatedExtraInfo,
      companyId,
      channel
    },
    {
      include: ["extraInfo"]
    }
    );

    io.emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });
  }

  return contact;
};

export default CreateOrUpdateContactService;
