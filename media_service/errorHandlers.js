exports.logErrors = function (err, req, res, next) {
  console.error(err.stack)
  next(err)
}

exports.errorHandler = function (err, req, res, next) {
  return res.json({
    status: "error",
    error: err.message
  })
}