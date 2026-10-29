export async function readPhoto(file:File):Promise<string>{
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const ratio=Math.min(1,1000/Math.max(image.width,image.height));
  const canvas=document.createElement("canvas");canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);
  const context=canvas.getContext("2d");if(!context)throw new Error("Image unavailable");
  context.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",.65);
 }finally{URL.revokeObjectURL(url);}
}
