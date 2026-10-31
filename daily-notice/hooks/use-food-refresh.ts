import {useState} from 'react';
import {readFoods} from '@/lib/pages-data.mjs';
import type {foodImport} from '@/lib/meal-plan.mjs';
export type FoodStock=NonNullable<ReturnType<typeof foodImport>>;
export function useFoodRefresh(_options:{autoStart?:boolean}={}){const [stock,setStock]=useState<FoodStock|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');async function refresh(){if(busy)return false;setBusy(true);try{setStock(await readFoods());setError('');return true;}catch(e){setError(e instanceof Error?e.message:'取得できませんでした。');return false;}finally{setBusy(false);}}return {stock,busy,error,authNeeded:false,manualMode:false,refresh,connect:refresh};}
