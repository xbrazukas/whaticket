import User from "../../models/User";

const FindUserByEmailService = async (email: string): Promise<User | null> => {
  const user = await User.findOne({
    attributes: ["name", "id", "email", "companyId", "profile"],
    where: { email }
  });

  console.log("User: ", user);

  return user ?? null;
};

export default FindUserByEmailService;
