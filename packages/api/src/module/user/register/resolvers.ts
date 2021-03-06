import * as yup from "yup";

import { ResolverMap } from "../../../types/graphql-utils";
import { formatYupError } from "../../../utils/formatError";
import { duplicateEmail } from "./errorMessages";
import { User } from "../../../entity/User";
import { createConfirmEmailLink } from "../../../utils/email/confirmEmail";
import { sendEmail } from "../../../utils/email/sendEmail";
import { passwordValidation, emailValidation } from "../../../yupSchema";

const schema = yup.object().shape({
  email: emailValidation,
  password: passwordValidation
});

export const resolvers: ResolverMap = {
  Mutation: {
    register: async (
      _,
      args: GQL.IRegisterOnMutationArguments,
      { redis, url }
    ) => {
      try {
        await schema.validate(args, { abortEarly: false });
      } catch (err) {
        return formatYupError(err);
      }

      const { email, password } = args;

      const existingUser = await User.findOne({
        where: { email },
        select: ["id"]
      });

      if (existingUser)
        return [
          {
            path: "email",
            message: duplicateEmail
          }
        ];

      const user = User.create({
        email,
        password
      });

      await user.save();

      // send confirm email
      const emailURL = await createConfirmEmailLink(url, user.id, redis);

      if (process.env.NODE_ENV !== "test") {
        sendEmail(email, emailURL);
      }

      return null;
    }
  }
};
