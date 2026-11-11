/** Current time as shown in the chat, e.g. "10:43 PM". */
export const clock = () =>
  new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
