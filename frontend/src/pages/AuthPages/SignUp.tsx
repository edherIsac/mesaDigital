import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Crear cuenta | TailAdmin — Panel de administración (React.js y Tailwind CSS)"
        description="Página de registro del panel TailAdmin — plantilla de administración con React.js y Tailwind CSS"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
