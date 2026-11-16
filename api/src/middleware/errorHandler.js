export function notFound(req, res) {
  res.status(404).json({ message: 'Recurso não encontrado' })
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Registo duplicado' })
  }
  const status = err.status || err.statusCode || 500
  const message = status >= 500 ? 'Erro interno do servidor' : (err.message || 'Erro')
  if (status >= 500) console.error(err)
  res.status(status).json({ message })
}
