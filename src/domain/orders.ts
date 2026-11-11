import type {Actor,Order,OrderCommand,OrderStatus,Pair,Quote} from './model';
export const currentQuote=(pair:Pair)=>pair.quotes.at(-1);
export const currentDecision=(pair:Pair)=>pair.decisions.filter(d=>d.quoteId===currentQuote(pair)?.id).at(-1);
export const accepted=(pair:Pair)=>currentDecision(pair)?.status==='accepted';
export const quoteTotal=(quote:Quote)=>quote.lines.reduce((sum,line)=>sum+line.price,0);
export const actorKey=(actor:Actor)=>actor.role==='master'?'master':actor.clientId;
export function orderStatus(order:Order):OrderStatus {
  if(!order.submitted)return 'draft';
  if(!order.pairs.length)return 'active';
  const closed=order.pairs.every(p=>p.excluded?p.custody!=='workshop':p.work==='ready'&&p.custody==='returned'&&!!p.payment);
  if(!closed)return 'active';
  return order.pairs.every(p=>p.excluded)?'cancelled':'completed';
}
export function pairLabel(pair:Pair):string {
  if(pair.excluded)return pair.custody==='workshop'?'К возврату без чистки':'Исключена';
  if(pair.custody==='returned')return 'Возвращена';
  if(pair.paused)return 'Работа на паузе';
  if(pair.work==='ready')return pair.payment?'Готова к возврату':'Ожидает оплаты';
  if(pair.work==='quality')return 'Контроль качества';
  if(pair.work==='in_progress')return 'В работе';
  if(!currentQuote(pair))return 'Ожидает оценки';
  const d=currentDecision(pair);
  if(d?.status==='declined')return 'Оценка отклонена';
  if(d?.status==='changes')return 'Нужны изменения';
  if(!accepted(pair))return 'Нужно согласование';
  return pair.custody==='workshop'?'Можно начинать':'Ожидаем передачу';
}
const requireThat:(condition:unknown,message:string)=>asserts condition=(condition,message)=>{if(!condition)throw new Error(message)};
export function applyCommand(original:Order,command:OrderCommand,actor:Actor,now=new Date().toISOString()):Order {
  requireThat(actor.role==='master'||original.clientId===actor.clientId,'Этот заказ принадлежит другому клиенту');
  const master=()=>requireThat(actor.role==='master','Действие доступно мастеру');
  const client=()=>requireThat(actor.role==='client','Решение принимает клиент');
  const id=()=>crypto.randomUUID();
  const order=structuredClone(original);
  const key=actorKey(actor);
  const p='pairId' in command&&command.pairId?order.pairs.find(x=>x.id===command.pairId):undefined;
  if('pairId' in command&&command.pairId)requireThat(p,'Пара не найдена');
  const pair=p!;
  let text='';let privateEvent=false;
  if(command.type!=='submit')requireThat(order.submitted,'Сначала отправьте заявку');
  switch(command.type){
    case 'submit': {
      client();if(order.submitted)return original;
      requireThat(order.pairs.length>=1&&order.pairs.length<=5,'В заявке должно быть от одной до пяти пар');
      requireThat(order.pairs.every(x=>x.type.trim()&&x.materials.length&&x.color.trim()),'Укажите тип, материал или «не знаю» и цвет каждой пары');
      order.submitted=true;text='Клиент отправил заявку';break;
    }
    case 'quote': {
      master();requireThat(!pair.excluded&&pair.work==='not_started'&&pair.custody!=='returned','Оценку можно менять только до начала работ');
      const prev=currentQuote(pair);requireThat(prev?.id===command.expectedQuoteId,'Оценка обновилась. Откройте актуальную версию');
      requireThat(!prev||command.reason.trim(),'Укажите причину пересмотра оценки');
      requireThat(command.lines.length&&command.lines.every(l=>l.name.trim()&&Number.isSafeInteger(l.price)&&l.price>=0)&&command.lines.reduce((s,l)=>s+l.price,0)>0,'Укажите услуги и корректную положительную стоимость');
      const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(new Date(now));
      requireThat(/^\d{4}-\d{2}-\d{2}$/.test(command.deadline)&&Number.isFinite(Date.parse(command.deadline))&&command.deadline>=today,'Дата готовности не может быть в прошлом');
      pair.quotes.push({id:id(),version:(prev?.version??0)+1,lines:structuredClone(command.lines),deadline:command.deadline,limitations:command.limitations.trim(),reason:command.reason.trim(),at:now});
      text=prev?'Мастер пересмотрел оценку. Нужно новое согласие':'Мастер отправил предложение';break;
    }
    case 'decision': {
      client();requireThat(!pair.excluded&&pair.work==='not_started','Решение по этой паре уже недоступно');
      const q=currentQuote(pair);requireThat(q?.id===command.quoteId,'Предложение обновилось. Посмотрите актуальную оценку');
      const previous=currentDecision(pair);if(previous?.status===command.status&&previous.comment===command.comment.trim())return original;
      pair.decisions.push({id:id(),quoteId:command.quoteId,status:command.status,comment:command.comment.trim(),at:now});
      text=command.status==='accepted'?'Клиент согласовал предложение':command.status==='declined'?'Клиент отклонил оценку':'Клиент запросил изменения';break;
    }
    case 'exclude': {
      client();if(pair.excluded)return original;
      requireThat(pair.work==='not_started','Работа уже началась. Напишите мастеру');
      pair.excluded=true;text=pair.custody==='workshop'?'Пара исключена. Обувь нужно вернуть':'Клиент исключил пару из заказа';break;
    }
    case 'intake': {
      master();requireThat(!pair.excluded&&pair.custody==='client','Эту пару сейчас нельзя принять');
      requireThat(command.condition.trim(),'Зафиксируйте состояние при приёмке');
      pair.custody='workshop';pair.intake={at:now,condition:command.condition.trim(),accessories:[...command.accessories]};pair.expertNote=command.expertNote.trim();
      text='Мастер принял пару и зафиксировал состояние';break;
    }
    case 'start': {
      master();requireThat(!pair.excluded&&pair.work==='not_started','Работу по этой паре нельзя начать');
      requireThat(pair.custody==='workshop'&&pair.intake?.condition,'Сначала примите обувь и зафиксируйте состояние');
      requireThat(accepted(pair),'Нужно согласие клиента на актуальную оценку');
      pair.work='in_progress';text='Мастер начал работу';break;
    }
    case 'pause': {
      master();requireThat(pair.work==='in_progress','Приостановить можно текущую работу');
      requireThat(!command.paused||command.reason.trim(),'Укажите причину паузы');
      if(pair.paused===command.paused)return original;
      pair.paused=command.paused;pair.pauseReason=command.paused?command.reason.trim():'';
      text=command.paused?'Работа приостановлена: '+pair.pauseReason:'Мастер возобновил работу';break;
    }
    case 'quality': {
      master();requireThat(pair.work==='in_progress'&&!pair.paused,'Контроль доступен после выполнения работы, без активной паузы');
      pair.work='quality';text='Пара передана на контроль качества';break;
    }
    case 'qualityResult': {
      master();requireThat(pair.work==='quality','Сначала передайте пару на контроль');
      requireThat(command.pass||command.note.trim(),'Укажите причину доработки');
      pair.work=command.pass?'ready':'in_progress';pair.resultNote=command.note.trim();pair.careNote=command.care.trim();
      text=command.pass?'Контроль пройден. Пара готова':'Нужна доработка: '+command.note.trim();break;
    }
    case 'pay': {
      client();if(pair.payment)return original;
      requireThat(!pair.excluded&&pair.work==='ready'&&accepted(pair),'Оплатить можно готовую согласованную работу');
      const q=currentQuote(pair)!;
      if(command.success){pair.payment={id:id(),quoteId:q.id,amount:quoteTotal(q),at:now};text='Демонстрационная оплата выполнена';}
      else text='Демонстрационная оплата отклонена. Можно повторить';break;
    }
    case 'return': {
      master();if(pair.custody==='returned')return original;
      requireThat(pair.custody==='workshop','Сначала подтвердите получение этой пары');
      requireThat(pair.excluded||(pair.work==='ready'&&pair.payment),'Перед возвратом завершите работу и демонстрационную оплату');
      pair.custody='returned';text='Мастер подтвердил возврат пары клиенту';break;
    }
    case 'eta': {
      master();requireThat(pair.work!=='ready'&&pair.custody!=='returned','Работа уже завершена');
      requireThat(command.eta&&command.reason.trim(),'Укажите прогноз и причину');pair.eta=command.eta;text='Обновлён прогноз готовности: '+command.reason.trim();break;
    }
    case 'message': {
      requireThat(command.text.trim(),'Напишите сообщение');
      order.messages.push({id:id(),text:command.text.trim(),actor:key,role:actor.role,at:now,pairId:command.pairId,readBy:[key]});text='Новое сообщение '+(actor.role==='master'?'мастера':'клиента');break;
    }
    case 'note': {
      master();requireThat(command.text.trim(),'Введите заметку');order.notes.push({id:id(),text:command.text.trim(),at:now});text='Добавлена внутренняя заметка';privateEvent=true;break;
    }
    case 'read': {
      const unread=order.messages.filter(m=>!m.readBy.includes(key));if(!unread.length)return original;
      unread.forEach(m=>m.readBy.push(key));break;
    }
    case 'feedback': {
      client();requireThat(orderStatus(order)==='completed','Отзыв доступен после завершения заказа');
      requireThat(Number.isInteger(command.rating)&&command.rating>=1&&command.rating<=5,'Выберите оценку от 1 до 5');order.feedback={rating:command.rating,text:command.text.trim(),at:now};text='Клиент оставил отзыв';break;
    }
  }
  order.revision+=1;order.updatedAt=now;
  if(text)order.events.push({id:id(),actor:key,at:now,text,pairId:p?.id,private:privateEvent});
  return order;
}
