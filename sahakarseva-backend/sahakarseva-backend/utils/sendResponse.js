const sendResponse = (res, statusCode, success, message, data = null) => {
  const body = { success, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

module.exports = sendResponse;
