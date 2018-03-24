import * as bodyParser from 'body-parser';
import * as express from 'express';
import { init, getIndexHash, update } from './checklist-handler';
import { join } from 'path';

init();
const mustacheExpress = require('mustache-express');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.set('view engine', 'html');
const baseDir = join(__dirname, '..');

app.engine('html', mustacheExpress(join(baseDir, '/partials'), '.html'));

app.set('view engine', 'html');
app.set('views', join(baseDir, '/views'));

app.get('/', (req, res)=>
{
	let hash:{items:any[]} = {
		items:getIndexHash()
	};

	res.render('index.html', hash);
});

app.post('/update', (req, res)=>
{
	update(Object.keys(req.body));
	res.redirect('/');
});

app.listen(3000, ()=>
{
	console.log('server has started');
});
