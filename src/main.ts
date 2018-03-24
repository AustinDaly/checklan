import * as express from 'express';
import { join } from 'path';

const mustacheExpress = require('mustache-express');
const app = express();

app.set('view engine', 'html');
const baseDir = join(__dirname, '..');

app.engine('html', mustacheExpress(join(baseDir, '/partials'), '.html'));

app.set('view engine', 'html');
app.set('views', join(baseDir, '/views'));

app.get('/', (req, res)=>
{
	let hash:{items:{done:boolean, id:string, name: string}[]} = {
		items:[{
			done: false,
			id: 'help',
			name: 'Help'
		},
		{
			done: true,
			id: 'foo',
			name: 'Foo'
		},
		{
			done: false,
			id: 'bar',
			name: 'Bar'
		}
	]
	}
	res.render('index.html', hash);
});

app.listen(3000, ()=>
{
	console.log('server has started');
})