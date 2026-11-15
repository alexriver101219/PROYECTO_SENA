const { StringDecoder } = require("node:string_decoder");
function inputError(code, message) {
  return Object.assign(new Error(message), { code });
}
// Terminal privado: no usa argumentos, historial, eco ni archivos temporales.
function readHidden(label, { input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function")
    return Promise.reject(inputError("PRIVATE_TTY_REQUIRED", "Se requiere una terminal interactiva privada"));
  return new Promise((resolve, reject) => {
    let value = "";
    const decoder = new StringDecoder("utf8");
    const wasRaw = Boolean(input.isRaw);
    const cleanup = () => {
      input.removeListener("data", onData);
      input.removeListener("error", onError);
      input.removeListener("end", onEnd);
      process.removeListener("SIGTERM", onEnd);
      input.setRawMode(wasRaw);
      input.pause();
      output.write("\n");
    };
    const fail = () => {
      value = "";
      cleanup();
      reject(inputError("PRIVATE_INPUT_CANCELLED", "Entrada privada cancelada"));
    };
    const onError = () => fail();
    const onEnd = () => fail();
    const onData = (chunk) => {
      const text = typeof chunk === "string" ? chunk : decoder.write(chunk);
      // Rechaza pegados multilínea y secuencias de control; nunca los reimprime.
      if ([...text].some((char) => char.charCodeAt(0) < 32 && ![8, 10, 13].includes(char.charCodeAt(0)))) return fail();
      const content = text.replace(/\r?\n$|\r$/u, "");
      if (/[\r\n]/u.test(content)) return fail();
      for (const char of content) {
        if (char === "\u007f" || char === "\b") value = [...value].slice(0, -1).join("");
        else value += char;
      }
      if (Buffer.byteLength(value) > 1024) return fail();
      if (content !== text) {
        cleanup();
        const result = value;
        value = "";
        resolve(result);
      }
    };
    output.write(label);
    input.setRawMode(true);
    input.on("data", onData);
    input.once("error", onError);
    input.once("end", onEnd);
    process.once("SIGTERM", onEnd);
    input.resume();
  });
}

function validateNewPassword(value) {
  if (typeof value !== "string" || [...value].length < 12 ||
      Buffer.byteLength(value, "utf8") > 72 || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))
    throw inputError("PASSWORD_POLICY", "La nueva clave requiere al menos 12 caracteres y máximo 72 bytes UTF-8, sin controles");
  return value;
}

function passwordFromEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable ${name}`);
  return validateNewPassword(value);
}

module.exports = { readHidden, validateNewPassword, passwordFromEnv };
