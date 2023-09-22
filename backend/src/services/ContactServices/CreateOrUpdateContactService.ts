import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";

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

  console.log("to aqui");

  const newArrayToAdd = [
    { name: 'Código', value: '0' },
    { name: 'Valor do Lead', value: '0' },
    { name: 'CEP', value: '0' },
    { name: 'Endereço', value: '0' },
    { name: 'Número', value: '0' },
    { name: 'Complemento', value: '0' },
    { name: 'Bairro', value: '0' },
    { name: 'Cidade', value: '0' },
    { name: 'Nascimento', value: '0' },
    { name: 'CPF', value: '0' },
    { name: 'RG', value: '0' },
    { name: 'Passaporte', value: '0' },
    { name: 'Validade Passaporte', value: '0' },
    { name: 'Observações', value: '0' },
    { name: 'Vendedor', value: '0' },
    { name: 'Inscrição Municipal', value: '0' },
    { name: 'Sexo', value: '0' },
    { name: 'Estrangeiro', value: '0' }
  ];

  const updatedExtraInfo = [...extraInfo, ...newArrayToAdd];

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
