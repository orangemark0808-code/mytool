import raw from '../data/initial-snapshot.json';
export type CalendarEvent={id:string;title:string;url:string;start:string;end:string;allDay:boolean};
export type TaskNote={title:string;status:string;priority:string;dueDate:string;updatedAt?:string|null;items:{text:string;checked:boolean}[]};
type Source={date:string;lastAttemptAt:string;lastSuccessAt:string|null;error:string|null};
export type Snapshot={schemaVersion:number;date:string;calendar:Source&{events:CalendarEvent[]};tasks:Source&{notes:TaskNote[]}};
export const initialSnapshot:Snapshot=raw;
