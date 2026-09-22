export type LoginValues = { identifier: string; password: string };
export type SignupValues = { company: string; cnpj: string; phone: string; email: string; password: string; confirmPassword: string; plan: string; consent: boolean };

export const onlyDigits = (value: string) => value.replace(/\D/g, "");
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function maskCpf(value: string) {
  return onlyDigits(value).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCnpj(value: string) {
  return onlyDigits(value).slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function repeatedDigits(value: string) { return /^(\d)\1+$/.test(value); }

export function isValidCpf(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || repeatedDigits(digits)) return false;
  const digit = (length: number) => {
    const total = digits.slice(0, length).split("").reduce((sum, current, index) => sum + Number(current) * (length + 1 - index), 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(digits[9]) && digit(10) === Number(digits[10]);
}

export function isValidCnpj(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || repeatedDigits(digits)) return false;
  const calculate = (base: string, weights: number[]) => {
    const total = base.split("").reduce((sum, current, index) => sum + Number(current) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculate(digits.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const second = calculate(digits.slice(0, 12) + first, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return first === Number(digits[12]) && second === Number(digits[13]);
}

export const passwordRules = (password: string) => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

export function validateLogin(values: LoginValues) {
  const errors: Partial<Record<keyof LoginValues, string>> = {};
  const identifier = values.identifier.trim();
  if (!identifier) errors.identifier = "Informe seu e-mail ou CPF.";
  else if (/^[\d.\-\s]+$/.test(identifier) ? !isValidCpf(identifier) : !isEmail(identifier)) errors.identifier = /^[\d.\-\s]+$/.test(identifier) ? "Informe um CPF válido." : "Informe um e-mail válido.";
  if (!values.password) errors.password = "Informe sua senha.";
  return errors;
}

export function validateSignup(values: SignupValues) {
  const errors: Partial<Record<keyof SignupValues, string>> = {};
  if (!values.company.trim()) errors.company = "Informe o nome da empresa.";
  else if (values.company.trim().length < 2) errors.company = "Use pelo menos 2 caracteres.";
  if (!values.cnpj) errors.cnpj = "Informe o CNPJ.";
  else if (!isValidCnpj(values.cnpj)) errors.cnpj = "Informe um CNPJ válido.";
  const phoneDigits = onlyDigits(values.phone);
  if (!values.phone) errors.phone = "Informe o telefone.";
  else if (phoneDigits.length < 10 || phoneDigits.length > 11) errors.phone = "Informe um telefone com DDD.";
  if (!values.email.trim()) errors.email = "Informe o e-mail do administrador.";
  else if (!isEmail(values.email)) errors.email = "Informe um e-mail válido.";
  const rules = passwordRules(values.password);
  if (!values.password) errors.password = "Crie uma senha.";
  else if (Object.values(rules).some((valid) => !valid)) errors.password = "A senha ainda não atende a todos os requisitos.";
  if (!values.confirmPassword) errors.confirmPassword = "Confirme a senha.";
  else if (values.confirmPassword !== values.password) errors.confirmPassword = "As senhas não coincidem.";
  if (!values.plan) errors.plan = "Escolha um plano para continuar.";
  if (!values.consent) errors.consent = "Você precisa aceitar os termos para continuar.";
  return errors;
}

