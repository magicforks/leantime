// ===== HORSE BREEDS =====
export const BREEDS = [
  {name:'Hannoveraner', speed:7, stamina:8, jump:6, dressage:7, cost:100, color:'#8B4513'},
  {name:'Holsteiner',   speed:8, stamina:7, jump:8, dressage:6, cost:150, color:'#4A3728'},
  {name:'Trakehner',    speed:9, stamina:7, jump:7, dressage:8, cost:120, color:'#2F1B0E'},
  {name:'Arab. Vollblut',speed:10,stamina:6,jump:6, dressage:7, cost:130, color:'#C4A27A'},
  {name:'Andalusier',   speed:7, stamina:8, jump:6, dressage:9, cost:140, color:'#E8E0D0'},
  {name:'Isländer',     speed:6, stamina:10,jump:5, dressage:6, cost:80,  color:'#C8A050'},
  {name:'Lipizzaner',   speed:7, stamina:8, jump:7, dressage:10,cost:160, color:'#F0EEE8'},
  {name:'Westfale',     speed:7, stamina:8, jump:8, dressage:7, cost:110, color:'#6B4226'},
  {name:'Haflinger',    speed:6, stamina:9, jump:6, dressage:6, cost:75,  color:'#D4882A'},
  {name:'Rheinländer',  speed:8, stamina:7, jump:7, dressage:7, cost:115, color:'#5C3317'}
];

export const EQUIPMENT_ITEMS = {
  saddles: [
    {name:'Western-Sattel',   cost:80,  type:'saddle', color:'#8B4513'},
    {name:'Spring-Sattel',    cost:120, type:'saddle', color:'#6B3410'},
    {name:'Dressur-Sattel',   cost:100, type:'saddle', color:'#3D1C08'},
    {name:'Allround-Sattel',  cost:90,  type:'saddle', color:'#A0522D'}
  ],
  bridles: [
    {name:'Trense',   cost:40, type:'bridle', color:'#4A2800'},
    {name:'Kandare',  cost:70, type:'bridle', color:'#2A1800'}
  ],
  blankets: [
    {name:'Fleece-Decke',           cost:30, type:'blanket', color:'#6080C0'},
    {name:'Regendecke',             cost:45, type:'blanket', color:'#3A5A3A'},
    {name:'Turnierschabracke',      cost:65, type:'blanket', color:'#800020'}
  ]
};
