(()=>{
  try{
    if(typeof TOPICS==='undefined')return;
    Object.assign(TOPICS,{
      'FAQ':['faq','dobré otázky'],
      'Mimozemský život':['mimozem','astrobiológ','exoplanét','civilizáci','biosignatúr','život vo vesmíre'],
      'Kosmologie':['kozmológ','veľký tresk','rozpín','časopriestor'],
      'Temná energie':['tmavá energia','tmavá hmota','dark energy'],
      'Černé díry':['čierna diera','čierne diery','horizont udalostí','singularit'],
      'Kvantová fyzika':['kvant','superpozíci','previazan','neurčitos'],
      'Relativita':['relativit','dilatácia času','rýchlosť svetla','časopriestor'],
      'Astronomie':['hviezd','planét','galaxi','teleskop','slnko','mesiac','mars','jupiter'],
      'Biologie a medicína':['bunk','mozog','gén','evolúci','vírus','baktéri','spermi','vajíč','alzheimer','dopamín'],
      'Matematika':['matemat','geometri','fraktál','nekonečn','chaos','pravdepodobnosť','štatistik','exponenciáln','normálne rozdelenie','normálne rozdelenia','rozdelenie pravdepodobnosti','priemer','medián','rozptyl','štandardná odchýlka','kombinatorik','logaritm'],
      'Technologie a AI':['umelá inteligencia','internet','počítač','robot','algoritm'],
      'Země a příroda':['zemetrasen','sopk','tornád','hurikán','klíma','oceán','geológ'],
      'Chemie a materiály':['chémi','molekul','atóm','prvok','hélium','materiál'],
      'Společnost a psychologie':['sociálne siete','psychológ','spoločnosť','morál','radikaliz','ekonómi','peniaz']
    });
  }catch(error){console.warn('Nepodarilo sa nastaviť slovenské kľúčové slová',error)}
})();