import type { SkyRegion } from "./types";
export function shortFieldName(region:SkyRegion):string {
  const names:Record<string,string>={m31:"Andromeda vicinity",orion:"Orion field",pleiades:"Pleiades field","galactic-center":"Galactic center area","south-ecliptic-pole":"South ecliptic field"};
  return names[region.slug] ?? region.name;
}
export function matchSkyField(text:string,regions:SkyRegion[]):SkyRegion | undefined {
  const query=text.toLowerCase().trim();
  if(!query) return undefined;
  const aliases:Record<string,string[]>={m31:["m31","andromeda"],orion:["m42","orion"],pleiades:["m45","pleiades"],"galactic-center":["milky way","galactic center"],"south-ecliptic-pole":["deep field","south pole","ecliptic pole"]};
  return regions.find(region=>[region.slug,region.name.toLowerCase(),...(aliases[region.slug]??[])].some(name=>query===name || query.includes(name)));
}
