const cassandra = require('cassandra-driver');
const client = new cassandra.Client({ contactPoints: ['127.0.0.1'], keyspace: 'twitter' });
const shortId = require("shortid");

exports.addMedia = function (req, res, next) {
  // req.file populated by multer
  if (!req.file) {return next(new Error("No File Attached"))}

  const filename = req.file.originalname
  const mimetype = req.file.mimetype
  const buffer = req.file.buffer
  const fileId = shortId.generate()

  const base64 = Buffer.from(buffer).toString('base64')
  const query = 'insert into media (fileId, filename, mimetype, contents) values (?, ?, ?, textAsBlob(?))'
  const values = [fileId, filename, mimetype, base64]

  client.execute(query, values, (err) => {
    if (err) { return next(err) }
    res.json({
      status: "OK",
      message: "Successfully uploaded file: " + filename
    })
  })
}

exports.getMedia = function (req, res, next) {
  const fileId = req.query.fileId || req.params['fileId'];
  const query = 'select blobAsText(contents) as contents, mimetype, filename from media where fileId=?'
  // const query = 'select mimetype, filename from media where fileId=?'
  const values = [fileId]

  client.execute(query, values, { prepare: true }, (err, result) => {
    if (err) { return next(err) }
    if (!result) { return next(new Error("File Not Found."))}
    const file = result.rows[0];

    const binary = file.contents
    const filename = file.filename
    const mimetype = file.mimetype
    const image = new Buffer(binary, 'base64');

    res.writeHead(200, {'Content-Type': mimetype});
    res.end(image);
  })
}