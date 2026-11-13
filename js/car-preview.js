const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export function carPreviewMarkup(car, className = "", alt = car.name) {
  if (car.frontAsset) {
    return `<img class="${escapeHtml(className)}" src="${escapeHtml(car.frontAsset)}" alt="${escapeHtml(alt)}" />`;
  }
  if (!car.previewCrop) return "";
  const crop = car.previewCrop;
  const sheetWidth = crop.sheetWidth || 1254;
  const sheetHeight = crop.sheetHeight || 1254;
  const imageStyle = [
    `width:${sheetWidth / crop.width * 100}%`,
    `height:${sheetHeight / crop.height * 100}%`,
    `left:${-crop.x / crop.width * 100}%`,
    `top:${-crop.y / crop.height * 100}%`,
  ].join(";");
  return `<span class="car-preview-crop ${escapeHtml(className)}" role="img" aria-label="${escapeHtml(alt)}" style="aspect-ratio:${crop.width}/${crop.height}"><img src="${escapeHtml(car.spriteAsset)}" alt="" style="${imageStyle}" /></span>`;
}
