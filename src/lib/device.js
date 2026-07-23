// Gera (ou reutiliza) um identificador único para este dispositivo/navegador.
// Guardado no localStorage — persiste entre sessões neste dispositivo,
// mas desaparece se o utilizador limpar os dados do navegador.
export function getDeviceId() {
  const KEY = 'fiado_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
