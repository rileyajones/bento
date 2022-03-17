/**
 * @fileoverview Creates an http server to handle responses for different test
 * cases.
 */
import bodyParser from 'body-parser';
import express, {Request, Response, NextFunction} from 'express';

export const app = express();
app.use(bodyParser.json());

function setCorsHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
}
app.use(setCorsHeaders);

app.use('/get', function (req: Request, res: Response) {
  res.json({
    args: req.query,
    headers: req.headers,
  });
});

app.use('/redirect-to', function (req: Request, res: Response) {
  res.redirect(302, req.query.url as string);
});

app.use('/status/404', function (_req, res) {
  res.status(404).end();
});

app.use('/status/500', function (_req, res) {
  res.status(500).end();
});

app.use('/cookies/set', function (req: Request, res: Response) {
  delete req.query.__amp_source_origin;
  for (const name in req.query) {
    res./*OK*/ cookie(name, req.query[name]);
  }
  res.json({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    cookies: req.cookies || {},
  });
});

app.use('/response-headers', function (req: Request, res: Response) {
  delete req.query.__amp_source_origin;
  for (const name in req.query) {
    res.setHeader(name, req.query[name] as string);
  }
  res.json({});
});

app.use('/post', function (req: Request, res: Response) {
  delete req.query.__amp_source_origin;
  res.json({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    json: req.body,
  });
});

app.use('/form/post/success', function (req: Request, res: Response) {
  delete req.query.__amp_source_origin;
  res.json({
    name: 'John Miller',
    interests: [{title: 'Football'}, {title: 'Basketball'}, {title: 'Writing'}],
  });
});

app.use('/form/post/error', function (req: Request, res: Response) {
  delete req.query.__amp_source_origin;
  res.status(500).json({
    error: 'alreadySubscribed',
    name: 'John Miller',
    email: 'john@miller.what',
  });
});

app.use('/form/post', function (req: Request, res: Response) {
  delete req.query.__amp_source_origin;
  res.json({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    json: req.body,
  });
});

app.use('/form/verify-error', function (_req: Request, res: Response) {
  res.status(400).json({
    verifyErrors: [{name: 'email', message: 'That email is already taken.'}],
  });
});
