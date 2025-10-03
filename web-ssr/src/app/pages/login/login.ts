import { Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

@Component({
  selector: "app-login",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./login.html",
  styleUrls: ["./login.css"],
})
export class Login {
  loginForm = signal<LoginForm>({
    email: "",
    password: "",
    rememberMe: false,
  });

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  updateEmail(event: Event) {
    const email = (event.target as HTMLInputElement).value;
    this.loginForm.update((form) => ({ ...form, email }));
  }

  updatePassword(event: Event) {
    const password = (event.target as HTMLInputElement).value;
    this.loginForm.update((form) => ({ ...form, password }));
  }

  toggleRememberMe() {
    this.loginForm.update((form) => ({
      ...form,
      rememberMe: !form.rememberMe,
    }));
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Simular llamada a API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Aquí iría la lógica de autenticación real
    const form = this.loginForm();
    if (form.email && form.password) {
      console.log("Login attempt:", form);

      // Simular autenticación exitosa
      if (typeof window !== "undefined") {
        localStorage.setItem("isAuthenticated", "true");

        // Simular rol de admin para usuarios específicos
        if (form.email.includes("admin")) {
          localStorage.setItem("isAdmin", "true");
        }

        // Verificar si hay una URL de retorno
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get("returnUrl") || "/cuenta";

        // Redirigir a la URL de retorno o a /cuenta
        window.location.href = returnUrl;
      }
    } else {
      this.errorMessage.set("Por favor completa todos los campos");
    }

    this.isLoading.set(false);
  }

  async handleSocialLogin(provider: "google" | "facebook" | "apple") {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Simular login social
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(`${provider} login attempt`);

    // Simular autenticación social exitosa
    if (typeof window !== "undefined") {
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("isAdmin", "false"); // Por defecto no admin en login social

      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get("returnUrl") || "/cuenta";

      window.location.href = returnUrl;
    }

    this.isLoading.set(false);
  }
}
