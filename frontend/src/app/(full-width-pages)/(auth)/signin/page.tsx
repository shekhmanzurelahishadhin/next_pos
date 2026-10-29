import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Multibrand POS",
};

export default function SignIn() {
  return <SignInForm />;
}
