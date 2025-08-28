/**
 * Sanitiza nomes de arquivos para compatibilidade com Supabase Storage
 * Remove acentos, caracteres especiais e espaços
 * Mantém apenas letras, números, hífens, underscores e pontos
 */
export function sanitizeFileName(fileName: string): string {
  // Separar nome e extensão
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
  
  // Remover acentos usando normalize
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacríticos
  
  // Substituir caracteres especiais e espaços por underscores
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Substitui caracteres não permitidos
    .replace(/_{2,}/g, '_') // Remove underscores múltiplos
    .replace(/^_|_$/g, ''); // Remove underscores no início/fim
  
  return sanitized + extension.toLowerCase();
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Valida se o arquivo é aceito pelos tipos permitidos
 */
export function validateFileType(file: File, acceptedTypes: Record<string, string[]>): boolean {
  const mimeType = file.type;
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  // Verificar por MIME type
  if (acceptedTypes[mimeType]) {
    return true;
  }
  
  // Verificar por extensão
  for (const [mime, extensions] of Object.entries(acceptedTypes)) {
    if (extensions.includes(fileExtension)) {
      return true;
    }
  }
  
  return false;
}