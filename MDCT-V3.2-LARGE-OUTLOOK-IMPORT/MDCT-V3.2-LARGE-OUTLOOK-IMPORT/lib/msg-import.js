const text = (v) => v == null ? '' : String(v);

function getHeader(headers, name) {
  if (!headers) return '';
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = String(headers).match(new RegExp(`^${escaped}:\\s*(.+(?:\\r?\\n[ \\t].+)*)`, 'im'));
  return m ? m[1].replace(/\r?\n[ \t]+/g, ' ').trim() : '';
}

function normaliseDate(info) {
  const raw = info?.messageDeliveryTime || info?.clientSubmitTime || info?.creationTime || getHeader(info?.headers, 'Date');
  if (!raw) return null;
  try { return new Date(raw).toISOString(); } catch { return null; }
}

function recipientText(info) {
  const recipients = Array.isArray(info?.recipients) ? info.recipients : [];
  return recipients.map(r => r?.email || r?.name || '').filter(Boolean).join('; ');
}

export async function readMsgFile(file) {
  if (!file || !/\.msg$/i.test(file.name || '')) throw new Error('Not an Outlook .msg file.');
  const arrayBuffer = await file.arrayBuffer();
  const mod = await import('@kenjiuno/msgreader');
  const MsgReader = mod.default || mod.MsgReader || mod;
  const reader = new MsgReader(new Uint8Array(arrayBuffer));
  const info = reader.getFileData();
  if (info?.error) throw new Error(info.error);
  const sender = text(info?.senderEmail || getHeader(info?.headers, 'From') || info?.senderName);
  const subject = text(info?.subject || getHeader(info?.headers, 'Subject'));
  const body = text(info?.body || info?.bodyHTML || info?.bodyHtml || '');
  const messageId = text(getHeader(info?.headers, 'Message-ID'));
  const to = text(getHeader(info?.headers, 'To') || recipientText(info));
  const cc = text(getHeader(info?.headers, 'Cc'));
  const attachmentNames = (info?.attachments || []).map(a => a?.fileName || a?.fileNameShort || '').filter(Boolean);
  return {
    subject,
    body,
    sender,
    to,
    cc,
    received: normaliseDate(info),
    messageId,
    folderName: file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0,-1).join('/') : 'MSG Import',
    sourceFile: file.name,
    source: 'MSG',
    attachmentNames
  };
}

export function filterMsgFiles(fileList) {
  return Array.from(fileList || []).filter(f => /\.msg$/i.test(f.name || ''));
}
