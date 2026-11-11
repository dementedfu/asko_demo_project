import type {Actor,Client,Order,OrderCommand,Photo,Service} from '../domain/model';
import {applyCommand,currentQuote} from '../domain/orders';
import {newOrder,newPair,uid} from './factories';
export const DEMO_VERSION='1.0.0';
export const demoClients:Client[]=[{id:'anna',name:'Анна Морозова',initials:'АМ',phone:'+7 (000) 000-00-01'},{id:'mikhail',name:'Михаил Левин',initials:'МЛ',phone:'+7 (000) 000-00-02'},{id:'olga',name:'Ольга Миронова',initials:'ОМ',phone:'+7 (000) 000-00-03'}];
export const demoServices:Service[]=[
 {id:'clean',name:'Комплексная чистка',description:'Верх, подошва, стельки и шнурки. Подбираем метод под материал.',price:240000,active:true},
 {id:'suede',name:'Деликатная чистка замши',description:'Бережная обработка и восстановление направления ворса.',price:280000,active:true},
 {id:'protect',name:'Защитная обработка',description:'Защита от влаги и повседневных загрязнений.',price:60000,active:true},
 {id:'fresh',name:'Устранение запаха',description:'Дополнительная обработка внутренней части.',price:40000,active:true}
];
export function seedData(){
 const orders:Order[]=[];const photos:Photo[]=[];
 const date=(offset:number)=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10)};
 const stamp=date(-7)+'T10:00:00.000Z';
 function make(number:string,clientId:string,kind='Кроссовки',count=1){let o=newOrder(clientId,number);o.createdAt=stamp;o.updatedAt=stamp;o.pairs=Array.from({length:count},(_,i)=>({...newPair(),type:i?'Ботинки':kind,materials:i?['Замша']:kind==='Кеды'?['Текстиль']:['Кожа','Текстиль'],color:i?'Бежевый':'Молочный',brand:i?'':'Everyday',condition:'Следы носки и пятна после прогулки',expectation:i?'Бережно освежить замшу':'Очистить верх и подошву',issues:[{id:uid(),side:'both' as const,zone:'Носок',category:'dirt' as const,kind:'Повседневное загрязнение',severity:2 as const,comment:''}]}));return o;}
 function act(o:Order,c:OrderCommand,role:'master'|'client'='master'){return applyCommand(o,c,{role,clientId:o.clientId},stamp)}
 function submit(o:Order){return act(o,{type:'submit'},'client')}
 function quote(o:Order,i=0,revised=false){const p=o.pairs[i];return act(o,{type:'quote',pairId:p.id,expectedQuoteId:currentQuote(p)?.id,lines:[{serviceId:i?'suede':'clean',name:i?'Деликатная чистка замши':'Комплексная чистка',price:i?280000:240000},{serviceId:'protect',name:'Защитная обработка',price:60000}],deadline:date(3),limitations:'Следы естественного износа могут сохраниться. Результат уточняем после приёмки.',reason:revised?'После приёмки обнаружены следы реагентов':''})}
 function decide(o:Order,i=0,status:'accepted'|'changes'='accepted'){return act(o,{type:'decision',pairId:o.pairs[i].id,quoteId:currentQuote(o.pairs[i])!.id,status,comment:status==='changes'?'Подскажите, можно ли без защитной обработки?':''},'client')}
 function intake(o:Order,i=0){return act(o,{type:'intake',pairId:o.pairs[i].id,condition:'Небольшие потёртости, загрязнение подошвы. Зафиксировано при приёмке.',accessories:['Шнурки','Стельки'],expertNote:'Материал уточнён: кожа и текстиль'})}
 function ready(o:Order,i=0){o=act(o,{type:'start',pairId:o.pairs[i].id});o=act(o,{type:'quality',pairId:o.pairs[i].id});return act(o,{type:'qualityResult',pairId:o.pairs[i].id,pass:true,note:'Чистка выполнена, загрязнения стали заметно слабее.',care:'Сушите при комнатной температуре. Не используйте батарею и агрессивные средства.'})}
 let o=submit(make('024','anna'));o=act(o,{type:'message',text:'Здравствуйте! Хочу освежить любимые кроссовки перед поездкой.'},'client');orders.push(o);
 o=submit(make('025','anna','Кроссовки',2));o=decide(quote(o));o=decide(quote(o,1),1,'changes');o=act(o,{type:'message',text:'Анна, для второй пары можно оставить только деликатную чистку. Сейчас обновлю предложение.'});orders.push(o);
 o=intake(decide(quote(submit(make('026','anna','Кеды')))));o=quote(o,0,true);orders.push(o);
 o=intake(decide(quote(submit(make('027','mikhail')))));o=act(o,{type:'start',pairId:o.pairs[0].id});o=act(o,{type:'pause',pairId:o.pairs[0].id,paused:true,reason:'Деликатная сушка после обработки'});o.pairs[0].quotes[0].deadline=date(-1);orders.push(o);
 o=intake(decide(quote(submit(make('028','mikhail','Кеды')))));o=act(o,{type:'start',pairId:o.pairs[0].id});o=act(o,{type:'quality',pairId:o.pairs[0].id});orders.push(o);
 o=ready(intake(decide(quote(submit(make('029','anna'))))));orders.push(o);
 o=submit(make('030','olga','Кроссовки',2));o=ready(intake(decide(quote(o))));o=act(o,{type:'pay',pairId:o.pairs[0].id,success:true},'client');o=act(o,{type:'return',pairId:o.pairs[0].id});o=intake(o,1);o=act(o,{type:'exclude',pairId:o.pairs[1].id},'client');orders.push(o);
 o=ready(intake(decide(quote(submit(make('031','anna','Кеды'))))));o=act(o,{type:'pay',pairId:o.pairs[0].id,success:true},'client');o=act(o,{type:'return',pairId:o.pairs[0].id});o=act(o,{type:'feedback',rating:5,text:'Спасибо за заботу и понятное согласование!'},'client');orders.push(o);
 orders.push(make('032','olga','Ботинки'));
 for(const order of orders)for(const pair of order.pairs){
  const asset=pair.materials.includes('Замша')?'/images/shoes.jpg':pair.type==='Кеды'?'/images/canvas.jpg':'/images/sneakers.jpg';
  const purposes:Photo['purpose'][]=['client'];if(pair.intake)purposes.push('intake');if(pair.work==='ready')purposes.push('result');
  for(const purpose of purposes)photos.push({id:uid(),orderId:order.id,pairId:pair.id,purpose,asset,name:'Демонстрационная иллюстрация',at:stamp});
 }
 return {orders,photos,clients:demoClients,services:demoServices};
}
