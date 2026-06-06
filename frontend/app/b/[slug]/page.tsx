// /b/<slug> → işletme sayfası. Aynı shop sayfası component'i slug'dan çözülür.
// (Eski businesses-API tabanlı sayfa emekliye ayrıldı; canlıda zaten çalışmıyordu — localhost:8000.)
// /shop/[id] route'u aynen çalışmaya devam eder.
export { default } from "../../shop/[id]/page";
