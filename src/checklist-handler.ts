import { EOL } from 'os';
import { join } from 'path';
import { watch, exists, writeFile, readFile, mkdir } from 'fs';

const baseDir = join(__dirname, '..');
const dataDir = join(baseDir, '/data');
interface checkList
{
	done: boolean
	name: string
}

interface hashCheckList
{
	done: boolean;
	name: string;
	id: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function replaceAll(target: string, search: string, replacement: string) 
{
    return target.replace(new RegExp(search, 'g'), replacement);
}

var checkListArray: checkList[] = [];
var lastAccessed: number = Date.now();

function stringNameToId(name:string): string
{
	return replaceAll(name.toLowerCase(), ' ', '-');
}

export function getIndexHash(): hashCheckList[]
{
	return checkListArray.map(value=>{
		return {done:value.done, name:value.name, id:stringNameToId(value.name)};
	});
}

async function getChecklistFromFile(path: string, isPath:boolean = true): Promise<checkList[]>
{
	var file:string|Error;
	if(isPath)
	{
		file = await (new Promise<string>((resolve, reject)=>
		{
			readFile(path, 'utf8', (err, data: string)=>{
				if(err) 
				{
					return reject(err);
				}
				resolve(data);
			})
		})).catch(err=>new Error(err));
	}
	else
	{
		file = path;
	}

	if(typeof(file)==='string')
	{
		let lines = file.split(EOL);
		return lines.map<checkList>((value)=>{
			return { name: value, done: false};
		});
	}
	else
	{
		return Promise.reject(file);
	}
}

function mergeUpdatedChecklist(list: checkList[])
{
	// Makes an array initialized with -1s
	let listPointer:number[] = Array.apply(null, {length: list.length}).map(()=>-1);

	// First we find the values that haven't changed or has moved.
	for(let i = 0; i < list.length; ++i)
	{
		for(let j = 0; j < checkListArray.length; ++j)
		{
			if(list[i].name === checkListArray[j].name)
			{
				listPointer[i] = j;
				break;
			}
		}
	}

	// Now we apply the changes so we keep the old information in the new list.
	for(let i = 0; i < list.length; ++i)
	{
		if(listPointer[i] !== -1)
		{
			list[i] = checkListArray[listPointer[i]];
		}
	}

	checkListArray = list;
}

function writeJson(path: string, data:any): Promise<void>
{
	return new Promise<void>((resolve, reject)=>{
		writeFile(path, JSON.stringify(data), err=>{
			if(err) reject(err);
			resolve();
		});
	});
}

async function readJson<T>(path: string): Promise<T>
{
	let file = await (new Promise<string>((resolve, reject)=>
	{
		readFile(path, 'utf8', (err, data: string)=>{
			if(err) return reject(err);
			resolve(data);
		})
	}).catch(err=>new Error(err)));

	if(typeof(file)==='string')
	{
		return JSON.parse(file) as T;
	}
	else
	{
		return Promise.reject(file);
	}
}

interface OutList
{
	dateAccessed:number,
	items:checkList[]
}

/**
 * Saves the list to disk for access later.
 * It takes the local variables checkListArray and lastAccessed.
 * Then it writes it to disk.
 * @returns A boolean value representing success.
 */
async function saveList(): Promise<boolean>
{
	let output:OutList = {
		dateAccessed: lastAccessed,
		items: checkListArray
	};

	let result = await writeJson(join(dataDir, 'itemData.json'), output).catch(err=>[err]);

	// If result is an instance of an array then it failed.
	return !(result instanceof Array);
}

/**
 * Loads checkListArray and lastAccessed with the data from disk.
 * @returns A boolean value representing success.
 */
async function loadList(): Promise<boolean>
{
	let data = await readJson<OutList>(join(dataDir, 'itemData.json')).catch(err=>[err]);

	if(data instanceof Array) return false;

	lastAccessed = data.dateAccessed;
	checkListArray = data.items;

	return true;
}

export async function init()
{
	// A wrapper for the exists function that makes it into a promise
	const exist = (path: string):Promise<boolean>=>{
		return new Promise<boolean>(resolve=>{
			exists(path, (e)=>{
				resolve(e);
			})
		});
	};

	// Checking if datadir exists
	if(!await exist(dataDir))
	{
		let a = await new Promise<void>((resolve, reject)=>
		{
			mkdir(dataDir, (err)=>{
				if(err) reject(err);
				resolve();
			})
		}).catch(err=>new Error(err));

		if(a instanceof Error)
		{
			console.error(`Could not make data. ${a}`);
			return;
		}
	}

	// Now we load the list. We don't care if it fails or not.
	await loadList();

	const checklistpath = join(baseDir, 'checklist.txt');

	let updatedList = await getChecklistFromFile(checklistpath).catch(err=>{return {err:err}});
		
	// There is not much else we can do here. So we're just returning.
	if(!(updatedList instanceof Array))
	{
		console.error(updatedList.err);
		return;
	}

	mergeUpdatedChecklist(updatedList);

	watch(checklistpath, 'utf8', async (event, filename)=>
	{
		if(event === 'change')
		{
			let updatedList = await getChecklistFromFile(filename).catch(err=>{return {err:err}});;
			// There is not much else we can do here. So we're just returning.
			if(!(updatedList instanceof Array))
			{
				console.error(updatedList.err);
				return;
			}
	
			mergeUpdatedChecklist(updatedList);
		}
	});
}

export async function update(ids:string[]): Promise<void>
{
	for(let i = 0; i < checkListArray.length; ++i)
	{
		checkListArray[i].done = ids.indexOf(stringNameToId(checkListArray[i].name)) !== -1;
	}
}
