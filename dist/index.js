// src/generated/models/ApiError.ts
var ApiErrorCodeEnum = {
  InvalidApiKey: "invalid_api_key",
  InsufficientScope: "insufficient_scope",
  RateLimited: "rate_limited",
  QuotaExceeded: "quota_exceeded",
  KeyLimitReached: "key_limit_reached",
  SpendCapReached: "spend_cap_reached",
  VerifyNotConfigured: "verify_not_configured",
  IdempotencyConflict: "idempotency_conflict",
  ServiceUnavailable: "service_unavailable",
  NotFound: "not_found",
  InvalidRequest: "invalid_request",
  UnsupportedMediaType: "unsupported_media_type",
  MediaTooLarge: "media_too_large",
  WhatsappNotConnected: "whatsapp_not_connected",
  MetaError: "meta_error",
  WindowExpired: "window_expired",
  TemplateNotApproved: "template_not_approved",
  NoSender: "no_sender",
  TemplateNameTaken: "template_name_taken",
  TemplateNotEditable: "template_not_editable",
  TemplateCategoryNotAllowed: "template_category_not_allowed",
  TestKeyNotAllowed: "test_key_not_allowed"
};

// src/generated/runtime.ts
var BASE_PATH = "https://api.msgeasy.com".replace(/\/+$/, "");
var Configuration = class {
  constructor(configuration = {}) {
    this.configuration = configuration;
  }
  configuration;
  set config(configuration) {
    this.configuration = configuration;
  }
  get basePath() {
    return this.configuration.basePath != null ? this.configuration.basePath : BASE_PATH;
  }
  get fetchApi() {
    return this.configuration.fetchApi;
  }
  get middleware() {
    return this.configuration.middleware || [];
  }
  get queryParamsStringify() {
    return this.configuration.queryParamsStringify || querystring;
  }
  get username() {
    return this.configuration.username;
  }
  get password() {
    return this.configuration.password;
  }
  get apiKey() {
    const apiKey = this.configuration.apiKey;
    if (apiKey) {
      return typeof apiKey === "function" ? apiKey : () => apiKey;
    }
    return void 0;
  }
  get accessToken() {
    const accessToken = this.configuration.accessToken;
    if (accessToken) {
      return typeof accessToken === "function" ? accessToken : async () => accessToken;
    }
    return void 0;
  }
  get headers() {
    return this.configuration.headers;
  }
  get credentials() {
    return this.configuration.credentials;
  }
};
var DefaultConfig = new Configuration();
var BaseAPI = class _BaseAPI {
  constructor(configuration = DefaultConfig) {
    this.configuration = configuration;
    this.middleware = configuration.middleware;
  }
  configuration;
  static jsonRegex = /^(:?application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(:?;.*)?$/i;
  middleware;
  withMiddleware(...middlewares) {
    const next = this.clone();
    next.middleware = next.middleware.concat(...middlewares);
    return next;
  }
  withPreMiddleware(...preMiddlewares) {
    const middlewares = preMiddlewares.map((pre) => ({ pre }));
    return this.withMiddleware(...middlewares);
  }
  withPostMiddleware(...postMiddlewares) {
    const middlewares = postMiddlewares.map((post) => ({ post }));
    return this.withMiddleware(...middlewares);
  }
  /**
   * Check if the given MIME is a JSON MIME.
   * JSON MIME examples:
   *   application/json
   *   application/json; charset=UTF8
   *   APPLICATION/JSON
   *   application/vnd.company+json
   * @param mime - MIME (Multipurpose Internet Mail Extensions)
   * @return True if the given MIME is JSON, false otherwise.
   */
  isJsonMime(mime) {
    if (!mime) {
      return false;
    }
    return _BaseAPI.jsonRegex.test(mime);
  }
  async request(context, initOverrides) {
    const { url, init } = await this.createFetchParams(context, initOverrides);
    const response = await this.fetchApi(url, init);
    if (response && (response.status >= 200 && response.status < 300)) {
      return response;
    }
    throw new ResponseError(response, "Response returned an error code");
  }
  async createFetchParams(context, initOverrides) {
    let url = this.configuration.basePath + context.path;
    if (context.query !== void 0 && Object.keys(context.query).length !== 0) {
      url += "?" + this.configuration.queryParamsStringify(context.query);
    }
    const headers = Object.assign({}, this.configuration.headers, context.headers);
    Object.keys(headers).forEach((key) => headers[key] === void 0 ? delete headers[key] : {});
    const initOverrideFn = typeof initOverrides === "function" ? initOverrides : async () => initOverrides;
    const initParams = {
      method: context.method,
      headers,
      body: context.body,
      credentials: this.configuration.credentials
    };
    const overriddenInit = {
      ...initParams,
      ...await initOverrideFn({
        init: initParams,
        context
      })
    };
    let body;
    if (isFormData(overriddenInit.body) || overriddenInit.body instanceof URLSearchParams || isBlob(overriddenInit.body)) {
      body = overriddenInit.body;
    } else if (this.isJsonMime(headers["Content-Type"])) {
      body = JSON.stringify(overriddenInit.body);
    } else {
      body = overriddenInit.body;
    }
    const init = {
      ...overriddenInit,
      body
    };
    return { url, init };
  }
  fetchApi = async (url, init) => {
    let fetchParams = { url, init };
    for (const middleware of this.middleware) {
      if (middleware.pre) {
        fetchParams = await middleware.pre({
          fetch: this.fetchApi,
          ...fetchParams
        }) || fetchParams;
      }
    }
    let response = void 0;
    try {
      response = await (this.configuration.fetchApi || fetch)(fetchParams.url, fetchParams.init);
    } catch (e) {
      for (const middleware of this.middleware) {
        if (middleware.onError) {
          response = await middleware.onError({
            fetch: this.fetchApi,
            url: fetchParams.url,
            init: fetchParams.init,
            error: e,
            response: response ? response.clone() : void 0
          }) || response;
        }
      }
      if (response === void 0) {
        if (e instanceof Error) {
          throw new FetchError(e, "The request failed and the interceptors did not return an alternative response");
        } else {
          throw e;
        }
      }
    }
    for (const middleware of this.middleware) {
      if (middleware.post) {
        response = await middleware.post({
          fetch: this.fetchApi,
          url: fetchParams.url,
          init: fetchParams.init,
          response: response.clone()
        }) || response;
      }
    }
    return response;
  };
  /**
   * Create a shallow clone of `this` by constructing a new instance
   * and then shallow cloning data members.
   */
  clone() {
    const constructor = this.constructor;
    const next = new constructor(this.configuration);
    next.middleware = this.middleware.slice();
    return next;
  }
};
function isBlob(value) {
  return typeof Blob !== "undefined" && value instanceof Blob;
}
function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}
var ResponseError = class extends Error {
  constructor(response, msg) {
    super(msg);
    this.response = response;
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    }
  }
  response;
  name = "ResponseError";
};
var FetchError = class extends Error {
  constructor(cause, msg) {
    super(msg);
    this.cause = cause;
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    }
  }
  cause;
  name = "FetchError";
};
var RequiredError = class extends Error {
  constructor(field, msg) {
    super(msg);
    this.field = field;
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    }
  }
  field;
  name = "RequiredError";
};
function querystring(params, prefix = "") {
  return Object.keys(params).map((key) => querystringSingleKey(key, params[key], prefix)).filter((part) => part.length > 0).join("&");
}
function querystringSingleKey(key, value, keyPrefix = "") {
  const fullKey = keyPrefix + (keyPrefix.length ? `[${key}]` : key);
  if (value instanceof Array) {
    const multiValue = value.map((singleValue) => encodeURIComponent(String(singleValue))).join(`&${encodeURIComponent(fullKey)}=`);
    return `${encodeURIComponent(fullKey)}=${multiValue}`;
  }
  if (value instanceof Set) {
    const valueAsArray = Array.from(value);
    return querystringSingleKey(key, valueAsArray, keyPrefix);
  }
  if (value instanceof Date) {
    return `${encodeURIComponent(fullKey)}=${encodeURIComponent(serializeDateTime(value))}`;
  }
  if (value instanceof Object) {
    return querystring(value, fullKey);
  }
  return `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`;
}
function serializeDateTime(value) {
  return value.toISOString();
}
function parseDateTime(value) {
  return new Date(value);
}
function canConsumeForm(consumes) {
  for (const consume of consumes) {
    if (consume.contentType?.startsWith("multipart/form-data") == true) {
      return true;
    }
  }
  return false;
}
var JSONApiResponse = class {
  constructor(raw, transformer = (jsonValue) => jsonValue) {
    this.raw = raw;
    this.transformer = transformer;
  }
  raw;
  transformer;
  async value() {
    return this.transformer(await this.raw.json());
  }
};

// src/errors.ts
var ErrorCode = ApiErrorCodeEnum;
var MsgEasyError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MsgEasyError";
  }
};
var APIError = class extends MsgEasyError {
  code;
  status;
  requestId;
  details;
  retryAfterSeconds;
  rateLimit;
  constructor(init) {
    super(init.message);
    this.name = new.target.name;
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId;
    this.details = init.details;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
    this.rateLimit = init.rateLimit;
  }
};
var AuthenticationError = class extends APIError {
};
var PermissionDeniedError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var QuotaError = class extends APIError {
};
var SetupRequiredError = class extends APIError {
};
var NotFoundError = class extends APIError {
};
var InvalidRequestError = class extends APIError {
};
var IdempotencyError = class extends APIError {
};
var WindowExpiredError = class extends APIError {
};
var TemplateError = class extends APIError {
};
var MetaError = class extends APIError {
};
var ServiceUnavailableError = class extends APIError {
};
var TestKeyError = class extends APIError {
};
var CODE_ERRORS = {
  invalid_api_key: AuthenticationError,
  insufficient_scope: PermissionDeniedError,
  rate_limited: RateLimitError,
  quota_exceeded: QuotaError,
  key_limit_reached: QuotaError,
  spend_cap_reached: QuotaError,
  verify_not_configured: SetupRequiredError,
  no_sender: SetupRequiredError,
  whatsapp_not_connected: SetupRequiredError,
  not_found: NotFoundError,
  invalid_request: InvalidRequestError,
  unsupported_media_type: InvalidRequestError,
  media_too_large: InvalidRequestError,
  idempotency_conflict: IdempotencyError,
  window_expired: WindowExpiredError,
  template_not_approved: TemplateError,
  template_name_taken: TemplateError,
  template_not_editable: TemplateError,
  template_category_not_allowed: TemplateError,
  meta_error: MetaError,
  service_unavailable: ServiceUnavailableError,
  test_key_not_allowed: TestKeyError
};
var ValidationError = class extends MsgEasyError {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
};
var APIConnectionError = class extends MsgEasyError {
  cause;
  constructor(message, cause) {
    super(message);
    this.name = "APIConnectionError";
    this.cause = cause;
  }
};
var BadEnvelopeError = class extends MsgEasyError {
  status;
  requestId;
  body;
  constructor(status, body, requestId) {
    super(`The API returned ${status} without a recognisable error body.`);
    this.name = "BadEnvelopeError";
    this.status = status;
    this.requestId = requestId;
    this.body = body;
  }
};
function numberHeader(response, name) {
  const raw = response.headers.get(name);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
function rateLimitOf(response) {
  const limit = numberHeader(response, "x-ratelimit-limit");
  const remaining = numberHeader(response, "x-ratelimit-remaining");
  const resetSeconds = numberHeader(response, "x-ratelimit-reset");
  if (limit === null || remaining === null || resetSeconds === null) return null;
  return { limit, remaining, resetSeconds };
}
function retryAfterOf(response) {
  const raw = response.headers.get("retry-after");
  if (raw === null || raw === "") return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
async function toMsgEasyError(error) {
  if (!(error instanceof ResponseError)) {
    if (error instanceof MsgEasyError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new APIConnectionError(message, error);
  }
  const response = error.response;
  const requestId = response.headers.get("x-request-id");
  const text = await response.text().catch(() => "");
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return new BadEnvelopeError(response.status, text, requestId);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return new BadEnvelopeError(response.status, text, requestId);
  }
  const envelope = body;
  if (typeof envelope.code !== "string") {
    return new BadEnvelopeError(response.status, text, requestId);
  }
  const Cls = CODE_ERRORS[envelope.code] ?? APIError;
  return new Cls({
    code: envelope.code,
    status: response.status,
    message: typeof envelope.message === "string" ? envelope.message : response.statusText,
    requestId,
    details: envelope.details,
    retryAfterSeconds: retryAfterOf(response),
    rateLimit: rateLimitOf(response)
  });
}

// src/generated/models/Media.ts
function MediaFromJSON(json) {
  return MediaFromJSONTyped(json, false);
}
function MediaFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "id": json["id"],
    "filename": json["filename"],
    "mimeType": json["mimeType"],
    "sizeBytes": json["sizeBytes"],
    "createdAt": json["createdAt"] == null ? json["createdAt"] : parseDateTime(json["createdAt"])
  };
}

// src/generated/apis/MediaApi.ts
var MediaApi = class extends BaseAPI {
  /**
   * Creates request options for mediaUpload without sending the request
   */
  async mediaUploadRequestOpts(requestParameters) {
    if (requestParameters["file"] == null) {
      throw new RequiredError(
        "file",
        'Required parameter "file" was null or undefined when calling mediaUpload().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    const consumes = [
      { contentType: "multipart/form-data" }
    ];
    const canConsumeForm2 = canConsumeForm(consumes);
    let formParams;
    let useForm = false;
    useForm = canConsumeForm2;
    if (useForm) {
      formParams = new FormData();
    } else {
      formParams = new URLSearchParams();
    }
    if (requestParameters["file"] != null) {
      formParams.append("file", requestParameters["file"]);
    }
    let urlPath = `/v1/media/`;
    return {
      path: urlPath,
      method: "POST",
      headers: headerParameters,
      query: queryParameters,
      body: formParams
    };
  }
  /**
   * Upload a file and receive a `med_` id to send with. Send the file as the body of a `multipart/form-data` request; no other fields are needed. The file is stored and registered with WhatsApp in one call, so the returned id is immediately usable. `Idempotency-Key` is honoured: the file itself is part of the fingerprint, so a retry replays the first result rather than storing a second copy.
   * Upload a file
   */
  async mediaUploadRaw(requestParameters, initOverrides) {
    const requestOptions = await this.mediaUploadRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => MediaFromJSON(jsonValue));
  }
  /**
   * Upload a file and receive a `med_` id to send with. Send the file as the body of a `multipart/form-data` request; no other fields are needed. The file is stored and registered with WhatsApp in one call, so the returned id is immediately usable. `Idempotency-Key` is honoured: the file itself is part of the fingerprint, so a retry replays the first result rather than storing a second copy.
   * Upload a file
   */
  async mediaUpload(requestParameters, initOverrides) {
    const response = await this.mediaUploadRaw(requestParameters, initOverrides);
    return await response.value();
  }
};

// src/generated/models/MessageError.ts
function MessageErrorFromJSON(json) {
  return MessageErrorFromJSONTyped(json, false);
}
function MessageErrorFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "code": json["code"],
    "message": json["message"]
  };
}

// src/generated/models/Message.ts
function MessageFromJSON(json) {
  return MessageFromJSONTyped(json, false);
}
function MessageFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "id": json["id"],
    "status": json["status"],
    "to": json["to"],
    "type": json["type"],
    "whatsappMessageId": json["whatsappMessageId"],
    "error": MessageErrorFromJSON(json["error"]),
    "createdAt": json["createdAt"] == null ? json["createdAt"] : parseDateTime(json["createdAt"]),
    "testMode": json["testMode"] == null ? void 0 : json["testMode"]
  };
}

// src/generated/models/SendMessageInput.ts
function SendMessageInputToJSON(json) {
  return SendMessageInputToJSONTyped(json, false);
}
function SendMessageInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  return {
    "to": value["to"],
    "type": value["type"],
    "text": value["text"],
    "templateId": value["templateId"],
    "variables": value["variables"],
    "mediaId": value["mediaId"],
    "caption": value["caption"],
    "replyTo": value["replyTo"]
  };
}

// src/generated/apis/MessagesApi.ts
var MessagesApi = class extends BaseAPI {
  /**
   * Creates request options for messagesGet without sending the request
   */
  async messagesGetRequestOpts(requestParameters) {
    if (requestParameters["id"] == null) {
      throw new RequiredError(
        "id",
        'Required parameter "id" was null or undefined when calling messagesGet().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/messages/{id}`;
    urlPath = urlPath.replace("{id}", encodeURIComponent(String(requestParameters["id"])));
    return {
      path: urlPath,
      method: "GET",
      headers: headerParameters,
      query: queryParameters
    };
  }
  /**
   * Fetch a message\'s delivery status. `accepted` means we hold it and Meta has not confirmed yet; `sent`, `delivered` and `read` track WhatsApp\'s own receipts; `failed` carries the reason in `error`. Covers any message in the account, including ones sent from the dashboard.
   * Get a message
   */
  async messagesGetRaw(requestParameters, initOverrides) {
    const requestOptions = await this.messagesGetRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => MessageFromJSON(jsonValue));
  }
  /**
   * Fetch a message\'s delivery status. `accepted` means we hold it and Meta has not confirmed yet; `sent`, `delivered` and `read` track WhatsApp\'s own receipts; `failed` carries the reason in `error`. Covers any message in the account, including ones sent from the dashboard.
   * Get a message
   */
  async messagesGet(requestParameters, initOverrides) {
    const response = await this.messagesGetRaw(requestParameters, initOverrides);
    return await response.value();
  }
  /**
   * Creates request options for messagesSend without sending the request
   */
  async messagesSendRequestOpts(requestParameters) {
    if (requestParameters["sendMessageInput"] == null) {
      throw new RequiredError(
        "sendMessageInput",
        'Required parameter "sendMessageInput" was null or undefined when calling messagesSend().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    headerParameters["Content-Type"] = "application/json";
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/messages/`;
    return {
      path: urlPath,
      method: "POST",
      headers: headerParameters,
      query: queryParameters,
      body: SendMessageInputToJSON(requestParameters["sendMessageInput"])
    };
  }
  /**
   * Send a WhatsApp message to a phone number. A `template` message may be sent at any time; `text` and `media` only within 24 hours of the recipient\'s last inbound message, which is WhatsApp\'s rule rather than ours. The sender is the number this key was issued against. Pass `variables` to fill a template\'s placeholders for this send. A `test` key runs the whole path without delivering anything and returns `testMode: true`.
   * Send a message
   */
  async messagesSendRaw(requestParameters, initOverrides) {
    const requestOptions = await this.messagesSendRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => MessageFromJSON(jsonValue));
  }
  /**
   * Send a WhatsApp message to a phone number. A `template` message may be sent at any time; `text` and `media` only within 24 hours of the recipient\'s last inbound message, which is WhatsApp\'s rule rather than ours. The sender is the number this key was issued against. Pass `variables` to fill a template\'s placeholders for this send. A `test` key runs the whole path without delivering anything and returns `testMode: true`.
   * Send a message
   */
  async messagesSend(requestParameters, initOverrides) {
    const response = await this.messagesSendRaw(requestParameters, initOverrides);
    return await response.value();
  }
};

// src/generated/models/MediaHeaderInput.ts
function instanceOfMediaHeaderInput(value) {
  if (!("type" in value) || value["type"] === void 0) return false;
  if (!("mediaId" in value) || value["mediaId"] === void 0) return false;
  return true;
}
function MediaHeaderInputToJSON(json) {
  return MediaHeaderInputToJSONTyped(json, false);
}
function MediaHeaderInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  return {
    "type": value["type"],
    "mediaId": value["mediaId"]
  };
}

// src/generated/models/TemplateVariableInput.ts
function TemplateVariableInputToJSON(json) {
  return TemplateVariableInputToJSONTyped(json, false);
}
function TemplateVariableInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  return {
    "index": value["index"],
    "exampleValue": value["exampleValue"],
    "paramName": value["paramName"]
  };
}

// src/generated/models/TextHeaderInput.ts
function instanceOfTextHeaderInput(value) {
  if (!("type" in value) || value["type"] === void 0) return false;
  if (value["type"] !== "TEXT") return false;
  if (!("text" in value) || value["text"] === void 0) return false;
  return true;
}
function TextHeaderInputToJSON(json) {
  return TextHeaderInputToJSONTyped(json, false);
}
function TextHeaderInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  return {
    "type": value["type"],
    "text": value["text"],
    "variables": value["variables"] == null ? void 0 : value["variables"].map(TemplateVariableInputToJSON)
  };
}

// src/generated/models/TemplateHeaderInput.ts
function TemplateHeaderInputToJSON(json) {
  return TemplateHeaderInputToJSONTyped(json, false);
}
function TemplateHeaderInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (instanceOfMediaHeaderInput(value)) {
    return MediaHeaderInputToJSON(value);
  }
  if (instanceOfTextHeaderInput(value)) {
    return TextHeaderInputToJSON(value);
  }
  return {};
}

// src/generated/models/CreateTemplateInput.ts
function CreateTemplateInputToJSON(json) {
  return CreateTemplateInputToJSONTyped(json, false);
}
function CreateTemplateInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  return {
    "name": value["name"],
    "category": value["category"],
    "language": value["language"],
    "body": value["body"],
    "variables": value["variables"] == null ? void 0 : value["variables"].map(TemplateVariableInputToJSON),
    "header": TemplateHeaderInputToJSON(value["header"]),
    "footer": value["footer"]
  };
}

// src/generated/models/TemplateVariable.ts
function TemplateVariableFromJSON(json) {
  return TemplateVariableFromJSONTyped(json, false);
}
function TemplateVariableFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "index": json["index"],
    "exampleValue": json["exampleValue"],
    "paramName": json["paramName"] == null ? void 0 : json["paramName"]
  };
}

// src/generated/models/MediaHeader.ts
function instanceOfMediaHeader(value) {
  if (!("type" in value) || value["type"] === void 0) return false;
  if (!("mediaId" in value) || value["mediaId"] === void 0) return false;
  return true;
}
function MediaHeaderFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "type": json["type"],
    "mediaId": json["mediaId"]
  };
}

// src/generated/models/TextHeader.ts
function instanceOfTextHeader(value) {
  if (!("type" in value) || value["type"] === void 0) return false;
  if (value["type"] !== "TEXT") return false;
  if (!("text" in value) || value["text"] === void 0) return false;
  return true;
}
function TextHeaderFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "type": json["type"],
    "text": json["text"],
    "variables": json["variables"] == null ? void 0 : json["variables"].map(TemplateVariableFromJSON)
  };
}

// src/generated/models/TemplateHeader.ts
function TemplateHeaderFromJSON(json) {
  return TemplateHeaderFromJSONTyped(json, false);
}
function TemplateHeaderFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  if (typeof json !== "object") {
    return json;
  }
  if (instanceOfMediaHeader(json)) {
    return MediaHeaderFromJSONTyped(json, true);
  }
  if (instanceOfTextHeader(json)) {
    return TextHeaderFromJSONTyped(json, true);
  }
  return {};
}

// src/generated/models/Template.ts
function TemplateFromJSON(json) {
  return TemplateFromJSONTyped(json, false);
}
function TemplateFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "id": json["id"],
    "name": json["name"],
    "status": json["status"],
    "category": json["category"],
    "language": json["language"],
    "body": json["body"],
    "variables": json["variables"].map(TemplateVariableFromJSON),
    "header": TemplateHeaderFromJSON(json["header"]),
    "footer": json["footer"],
    "rejectionReason": json["rejectionReason"],
    "approvedAt": json["approvedAt"] == null ? null : parseDateTime(json["approvedAt"]),
    "createdAt": json["createdAt"] == null ? json["createdAt"] : parseDateTime(json["createdAt"]),
    "updatedAt": json["updatedAt"] == null ? json["updatedAt"] : parseDateTime(json["updatedAt"])
  };
}

// src/generated/models/TemplateList.ts
function TemplateListFromJSON(json) {
  return TemplateListFromJSONTyped(json, false);
}
function TemplateListFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "data": json["data"].map(TemplateFromJSON),
    "hasMore": json["has_more"]
  };
}

// src/generated/models/TemplateIssue.ts
function TemplateIssueFromJSON(json) {
  return TemplateIssueFromJSONTyped(json, false);
}
function TemplateIssueFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "field": json["field"],
    "message": json["message"]
  };
}

// src/generated/models/TemplateValidation.ts
function TemplateValidationFromJSON(json) {
  return TemplateValidationFromJSONTyped(json, false);
}
function TemplateValidationFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "valid": json["valid"],
    "issues": json["issues"].map(TemplateIssueFromJSON)
  };
}

// src/generated/models/UpdateTemplateInput.ts
function UpdateTemplateInputToJSON(json) {
  return UpdateTemplateInputToJSONTyped(json, false);
}
function UpdateTemplateInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  return {
    "name": value["name"],
    "category": value["category"],
    "language": value["language"],
    "body": value["body"],
    "variables": value["variables"] == null ? void 0 : value["variables"].map(TemplateVariableInputToJSON),
    "header": TemplateHeaderInputToJSON(value["header"]),
    "footer": value["footer"]
  };
}

// src/generated/apis/TemplatesApi.ts
var TemplatesApi = class extends BaseAPI {
  /**
   * Creates request options for templatesCreate without sending the request
   */
  async templatesCreateRequestOpts(requestParameters) {
    if (requestParameters["createTemplateInput"] == null) {
      throw new RequiredError(
        "createTemplateInput",
        'Required parameter "createTemplateInput" was null or undefined when calling templatesCreate().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    headerParameters["Content-Type"] = "application/json";
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/templates/`;
    return {
      path: urlPath,
      method: "POST",
      headers: headerParameters,
      query: queryParameters,
      body: CreateTemplateInputToJSON(requestParameters["createTemplateInput"])
    };
  }
  /**
   * Create a utility template and submit it to Meta in one call. There is no draft state. Returns `processing`; poll `GET /v1/templates/{id}` until it is `approved` or `rejected`, then send with the returned `tpl_` id. A media header takes a `med_` id from `POST /v1/media/`. Requires an `Idempotency-Key`, since a create permanently claims the name on your WhatsApp Business Account.
   * Create a template
   */
  async templatesCreateRaw(requestParameters, initOverrides) {
    const requestOptions = await this.templatesCreateRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => TemplateFromJSON(jsonValue));
  }
  /**
   * Create a utility template and submit it to Meta in one call. There is no draft state. Returns `processing`; poll `GET /v1/templates/{id}` until it is `approved` or `rejected`, then send with the returned `tpl_` id. A media header takes a `med_` id from `POST /v1/media/`. Requires an `Idempotency-Key`, since a create permanently claims the name on your WhatsApp Business Account.
   * Create a template
   */
  async templatesCreate(requestParameters, initOverrides) {
    const response = await this.templatesCreateRaw(requestParameters, initOverrides);
    return await response.value();
  }
  /**
   * Creates request options for templatesGet without sending the request
   */
  async templatesGetRequestOpts(requestParameters) {
    if (requestParameters["id"] == null) {
      throw new RequiredError(
        "id",
        'Required parameter "id" was null or undefined when calling templatesGet().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/templates/{id}`;
    urlPath = urlPath.replace("{id}", encodeURIComponent(String(requestParameters["id"])));
    return {
      path: urlPath,
      method: "GET",
      headers: headerParameters,
      query: queryParameters
    };
  }
  /**
   * Fetch one template\'s approval status. `processing` means Meta is still reviewing; `rejected` carries the reason. Covers any template on the account, including one Meta re-classified as marketing, which the list omits.
   * Get a template
   */
  async templatesGetRaw(requestParameters, initOverrides) {
    const requestOptions = await this.templatesGetRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => TemplateFromJSON(jsonValue));
  }
  /**
   * Fetch one template\'s approval status. `processing` means Meta is still reviewing; `rejected` carries the reason. Covers any template on the account, including one Meta re-classified as marketing, which the list omits.
   * Get a template
   */
  async templatesGet(requestParameters, initOverrides) {
    const response = await this.templatesGetRaw(requestParameters, initOverrides);
    return await response.value();
  }
  /**
   * Creates request options for templatesList without sending the request
   */
  async templatesListRequestOpts(requestParameters) {
    const queryParameters = {};
    if (requestParameters["limit"] != null) {
      queryParameters["limit"] = requestParameters["limit"];
    }
    if (requestParameters["startingAfter"] != null) {
      queryParameters["starting_after"] = requestParameters["startingAfter"];
    }
    if (requestParameters["status"] != null) {
      queryParameters["status"] = requestParameters["status"];
    }
    if (requestParameters["updatedAfter"] != null) {
      queryParameters["updatedAfter"] = requestParameters["updatedAfter"];
    }
    const headerParameters = {};
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/templates/`;
    return {
      path: urlPath,
      method: "GET",
      headers: headerParameters,
      query: queryParameters
    };
  }
  /**
   * List this account\'s utility templates, newest change first. Pass `status` and `updatedAfter` to poll for just what moved since your last call, and `starting_after` with the last id to page. Marketing templates are not listed, since `/v1/messages` will not send them.
   * List templates
   */
  async templatesListRaw(requestParameters, initOverrides) {
    const requestOptions = await this.templatesListRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => TemplateListFromJSON(jsonValue));
  }
  /**
   * List this account\'s utility templates, newest change first. Pass `status` and `updatedAfter` to poll for just what moved since your last call, and `starting_after` with the last id to page. Marketing templates are not listed, since `/v1/messages` will not send them.
   * List templates
   */
  async templatesList(requestParameters = {}, initOverrides) {
    const response = await this.templatesListRaw(requestParameters, initOverrides);
    return await response.value();
  }
  /**
   * Creates request options for templatesUpdate without sending the request
   */
  async templatesUpdateRequestOpts(requestParameters) {
    if (requestParameters["id"] == null) {
      throw new RequiredError(
        "id",
        'Required parameter "id" was null or undefined when calling templatesUpdate().'
      );
    }
    if (requestParameters["updateTemplateInput"] == null) {
      throw new RequiredError(
        "updateTemplateInput",
        'Required parameter "updateTemplateInput" was null or undefined when calling templatesUpdate().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    headerParameters["Content-Type"] = "application/json";
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/templates/{id}`;
    urlPath = urlPath.replace("{id}", encodeURIComponent(String(requestParameters["id"])));
    return {
      path: urlPath,
      method: "PATCH",
      headers: headerParameters,
      query: queryParameters,
      body: UpdateTemplateInputToJSON(requestParameters["updateTemplateInput"])
    };
  }
  /**
   * Fix a template Meta rejected and resubmit it. Only a `pending` or `rejected` template may be edited — Meta freezes content once a template is approved or in review, so anything else is a 409. Omitted fields keep their current value.
   * Update a template
   */
  async templatesUpdateRaw(requestParameters, initOverrides) {
    const requestOptions = await this.templatesUpdateRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => TemplateFromJSON(jsonValue));
  }
  /**
   * Fix a template Meta rejected and resubmit it. Only a `pending` or `rejected` template may be edited — Meta freezes content once a template is approved or in review, so anything else is a 409. Omitted fields keep their current value.
   * Update a template
   */
  async templatesUpdate(requestParameters, initOverrides) {
    const response = await this.templatesUpdateRaw(requestParameters, initOverrides);
    return await response.value();
  }
  /**
   * Creates request options for templatesValidate without sending the request
   */
  async templatesValidateRequestOpts(requestParameters) {
    if (requestParameters["createTemplateInput"] == null) {
      throw new RequiredError(
        "createTemplateInput",
        'Required parameter "createTemplateInput" was null or undefined when calling templatesValidate().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    headerParameters["Content-Type"] = "application/json";
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/templates/validate`;
    return {
      path: urlPath,
      method: "POST",
      headers: headerParameters,
      query: queryParameters,
      body: CreateTemplateInputToJSON(requestParameters["createTemplateInput"])
    };
  }
  /**
   * Check a template against our content rules without creating it. Nothing is stored and Meta is not called, so a `test` key may use it. Returns every issue at once. Passing here does not guarantee Meta will approve — that review is separate.
   * Validate a template
   */
  async templatesValidateRaw(requestParameters, initOverrides) {
    const requestOptions = await this.templatesValidateRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => TemplateValidationFromJSON(jsonValue));
  }
  /**
   * Check a template against our content rules without creating it. Nothing is stored and Meta is not called, so a `test` key may use it. Returns every issue at once. Passing here does not guarantee Meta will approve — that review is separate.
   * Validate a template
   */
  async templatesValidate(requestParameters, initOverrides) {
    const response = await this.templatesValidateRaw(requestParameters, initOverrides);
    return await response.value();
  }
};

// src/generated/models/CheckVerificationInput.ts
function CheckVerificationInputToJSON(json) {
  return CheckVerificationInputToJSONTyped(json, false);
}
function CheckVerificationInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  return {
    "verificationId": value["verificationId"],
    "code": value["code"]
  };
}

// src/generated/models/StartVerificationInput.ts
function StartVerificationInputToJSON(json) {
  return StartVerificationInputToJSONTyped(json, false);
}
function StartVerificationInputToJSONTyped(value, ignoreDiscriminator = false) {
  if (value == null) {
    return value;
  }
  return {
    "phone": value["phone"],
    "channel": value["channel"],
    "ttlSeconds": value["ttlSeconds"],
    "codeLength": value["codeLength"]
  };
}

// src/generated/models/Verification.ts
function VerificationFromJSON(json) {
  return VerificationFromJSONTyped(json, false);
}
function VerificationFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "verificationId": json["verificationId"],
    "status": json["status"],
    "expiresAt": json["expiresAt"] == null ? json["expiresAt"] : parseDateTime(json["expiresAt"]),
    "channel": json["channel"],
    "testMode": json["testMode"] == null ? void 0 : json["testMode"],
    "code": json["code"] == null ? void 0 : json["code"]
  };
}

// src/generated/models/VerificationCheck.ts
function VerificationCheckFromJSON(json) {
  return VerificationCheckFromJSONTyped(json, false);
}
function VerificationCheckFromJSONTyped(json, ignoreDiscriminator) {
  if (json == null) {
    return json;
  }
  return {
    "status": json["status"],
    "remainingAttempts": json["remainingAttempts"] == null ? void 0 : json["remainingAttempts"]
  };
}

// src/generated/apis/VerifyApi.ts
var VerifyApi = class extends BaseAPI {
  /**
   * Creates request options for verifyCheck without sending the request
   */
  async verifyCheckRequestOpts(requestParameters) {
    if (requestParameters["checkVerificationInput"] == null) {
      throw new RequiredError(
        "checkVerificationInput",
        'Required parameter "checkVerificationInput" was null or undefined when calling verifyCheck().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    headerParameters["Content-Type"] = "application/json";
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/verify/check`;
    return {
      path: urlPath,
      method: "POST",
      headers: headerParameters,
      query: queryParameters,
      body: CheckVerificationInputToJSON(requestParameters["checkVerificationInput"])
    };
  }
  /**
   * Check a code against a verification. Always a `200` carrying the resulting `status` — `approved`, `invalid`, `expired` or `max_attempts` — rather than an error status, so a client branches on one field. Re-checking a verification that already reached a terminal status returns that status unchanged and costs no attempt, which makes a retried check safe inside the TTL.
   * Check a verification code
   */
  async verifyCheckRaw(requestParameters, initOverrides) {
    const requestOptions = await this.verifyCheckRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => VerificationCheckFromJSON(jsonValue));
  }
  /**
   * Check a code against a verification. Always a `200` carrying the resulting `status` — `approved`, `invalid`, `expired` or `max_attempts` — rather than an error status, so a client branches on one field. Re-checking a verification that already reached a terminal status returns that status unchanged and costs no attempt, which makes a retried check safe inside the TTL.
   * Check a verification code
   */
  async verifyCheck(requestParameters, initOverrides) {
    const response = await this.verifyCheckRaw(requestParameters, initOverrides);
    return await response.value();
  }
  /**
   * Creates request options for verifyStart without sending the request
   */
  async verifyStartRequestOpts(requestParameters) {
    if (requestParameters["startVerificationInput"] == null) {
      throw new RequiredError(
        "startVerificationInput",
        'Required parameter "startVerificationInput" was null or undefined when calling verifyStart().'
      );
    }
    const queryParameters = {};
    const headerParameters = {};
    headerParameters["Content-Type"] = "application/json";
    if (this.configuration && this.configuration.apiKey) {
      headerParameters["x-api-key"] = await this.configuration.apiKey("x-api-key");
    }
    let urlPath = `/v1/verify/start`;
    return {
      path: urlPath,
      method: "POST",
      headers: headerParameters,
      query: queryParameters,
      body: StartVerificationInputToJSON(requestParameters["startVerificationInput"])
    };
  }
  /**
   * Send a verification code to a phone number using this account\'s approved WhatsApp authentication template. Returns a `verificationId` to pass to `/check`. `ttlSeconds` and `codeLength` may be overridden per call; everything else comes from the account\'s Verify configuration. A `test` key runs the whole flow without sending a message and returns the generated code so the path is exercisable.
   * Send a verification code
   */
  async verifyStartRaw(requestParameters, initOverrides) {
    const requestOptions = await this.verifyStartRequestOpts(requestParameters);
    const response = await this.request(requestOptions, initOverrides);
    return new JSONApiResponse(response, (jsonValue) => VerificationFromJSON(jsonValue));
  }
  /**
   * Send a verification code to a phone number using this account\'s approved WhatsApp authentication template. Returns a `verificationId` to pass to `/check`. `ttlSeconds` and `codeLength` may be overridden per call; everything else comes from the account\'s Verify configuration. A `test` key runs the whole flow without sending a message and returns the generated code so the path is exercisable.
   * Send a verification code
   */
  async verifyStart(requestParameters, initOverrides) {
    const response = await this.verifyStartRaw(requestParameters, initOverrides);
    return await response.value();
  }
};

// src/http.ts
import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
var attemptStore = new AsyncLocalStorage();
var DEFAULT_TIMEOUT_MS = 3e4;
var MAX_ATTEMPTS = 3;
var BACKOFF_MS = [500, 1e3];
var MAX_IDEMPOTENCY_KEY_LENGTH = 255;
var RETRYABLE_CODES = /* @__PURE__ */ new Set(["rate_limited", "service_unavailable"]);
function isRetryableConflict(error) {
  return error.code === "idempotency_conflict" && error.retryAfterSeconds !== null;
}
function shouldRetry(error) {
  if (error instanceof APIConnectionError) return true;
  if (error instanceof APIError) {
    return RETRYABLE_CODES.has(error.code) || isRetryableConflict(error);
  }
  return false;
}
function waitFor(error, attempt) {
  if (error instanceof APIError && error.retryAfterSeconds !== null) {
    return error.retryAfterSeconds * 1e3;
  }
  const base = BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1] ?? 1e3;
  return base + Math.random() * base * 0.25;
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetries(call, options = {}) {
  const supplied = options.callOptions?.idempotencyKey;
  if (supplied !== void 0) {
    if (supplied === "") throw new ValidationError("idempotencyKey must not be empty.");
    if (supplied.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new ValidationError(
        `idempotencyKey must be ${MAX_IDEMPOTENCY_KEY_LENGTH} characters or fewer, got ${supplied.length}.`
      );
    }
  }
  const key = options.write ? supplied ?? randomUUID() : void 0;
  let last;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await attemptStore.run(attempt + 1, () => call(key));
    } catch (raw) {
      last = await toMsgEasyError(raw);
      if (attempt === MAX_ATTEMPTS - 1 || !shouldRetry(last)) throw last;
      await sleep(waitFor(last, attempt));
    }
  }
  throw last;
}
function timedFetch(timeoutMs) {
  return async (input, init) => {
    if (init?.signal) return fetch(input, init);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}
function callInit(key, options = {}, body) {
  return async ({ init }) => ({
    headers: {
      ...init.headers,
      ...key ? { "Idempotency-Key": key } : {}
    },
    // Built per attempt, so a retry gets the full timeout rather than what was left of it.
    ...options.timeoutMs === void 0 ? {} : { signal: AbortSignal.timeout(options.timeoutMs) },
    // Only media sends one: the generated core appends the file unnamed, and this
    // replaces that body with a named one.
    ...body === void 0 ? {} : { body }
  });
}

// src/observe.ts
function summariseBody(body) {
  if (body === null || body === void 0) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const file = body.get("file");
    if (file instanceof Blob) {
      return {
        filename: typeof File !== "undefined" && file instanceof File ? file.name : null,
        mimeType: file.type || null,
        sizeBytes: file.size
      };
    }
    return "<form data>";
  }
  return "<binary>";
}
function parseOrText(text) {
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
function observingFetch(inner, onResponse) {
  return async (input, init) => {
    const startedAt = Date.now();
    const method = init?.method ?? "GET";
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    const idempotencyKey = headers.get("Idempotency-Key");
    const attempt = attemptStore.getStore() ?? 1;
    const emit = (build) => {
      try {
        onResponse(build());
      } catch {
      }
    };
    let response;
    try {
      response = await inner(input, init);
    } catch (cause) {
      emit(() => ({
        method,
        url,
        status: null,
        requestBody: summariseBody(init?.body),
        responseBody: null,
        requestId: null,
        idempotencyKey,
        rateLimit: null,
        retryAfterSeconds: null,
        elapsedMs: Date.now() - startedAt,
        attempt,
        transportError: cause instanceof Error ? cause.message : String(cause)
      }));
      throw cause;
    }
    let responseBody = null;
    try {
      responseBody = parseOrText(await response.clone().text());
    } catch {
    }
    emit(() => ({
      method,
      url,
      status: response.status,
      requestBody: summariseBody(init?.body),
      responseBody,
      requestId: response.headers.get("x-request-id"),
      idempotencyKey,
      rateLimit: rateLimitOf(response),
      retryAfterSeconds: retryAfterOf(response),
      elapsedMs: Date.now() - startedAt,
      attempt,
      transportError: null
    }));
    return response;
  };
}

// src/version.ts
var VERSION = true ? "0.1.0" : "0.0.0-dev";

// src/client.ts
var DEFAULT_BASE_URL = "https://api.msgeasy.com";
function templateQuery(query) {
  const { updatedAfter, ...rest } = query;
  return {
    ...rest,
    ...updatedAfter ? { updatedAfter: updatedAfter instanceof Date ? updatedAfter.toISOString() : updatedAfter } : {}
  };
}
var MsgEasy = class {
  /**
   * What the most recent response reported — whichever call that was, so a pacing
   * signal rather than a per-call fact. `null` on a key with no limit.
   */
  rateLimit = null;
  verify;
  messages;
  media;
  templates;
  constructor(apiKey, options = {}) {
    if (!apiKey) throw new Error("An API key is required.");
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const timed = timedFetch(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const fetchApi = options.onResponse ? observingFetch(timed, options.onResponse) : timed;
    const headers = {
      "x-api-key": apiKey,
      "User-Agent": `msgeasy-node/${VERSION}`
    };
    const recordRateLimit = {
      post: async ({ response }) => {
        this.rateLimit = rateLimitOf(response);
      }
    };
    const config = new Configuration({
      basePath: baseUrl,
      fetchApi,
      middleware: [recordRateLimit],
      headers
    });
    this.verify = new VerifyNamespace(new VerifyApi(config));
    this.messages = new MessagesNamespace(new MessagesApi(config));
    this.media = new MediaNamespace(new MediaApi(config));
    this.templates = new TemplatesNamespace(new TemplatesApi(config));
  }
};
var VerifyNamespace = class {
  constructor(api) {
    this.api = api;
  }
  api;
  start(body, options = {}) {
    return withRetries(
      (key) => this.api.verifyStart({ startVerificationInput: body }, callInit(key, options)),
      { write: true, callOptions: options }
    );
  }
  check(body, options = {}) {
    return withRetries(
      (key) => this.api.verifyCheck({ checkVerificationInput: body }, callInit(key, options)),
      { write: true, callOptions: options }
    );
  }
};
var MessagesNamespace = class {
  constructor(api) {
    this.api = api;
  }
  api;
  send(body, options = {}) {
    return withRetries(
      (key) => this.api.messagesSend({ sendMessageInput: body }, callInit(key, options)),
      { write: true, callOptions: options }
    );
  }
  get(id, options = {}) {
    return withRetries(() => this.api.messagesGet({ id }, callInit(void 0, options)));
  }
};
var MediaNamespace = class {
  constructor(api) {
    this.api = api;
  }
  api;
  upload(file, filename, options = {}) {
    return withRetries(
      (key) => {
        const form = new FormData();
        form.append("file", file, filename);
        return this.api.mediaUpload({ file }, callInit(key, options, form));
      },
      { write: true, callOptions: options }
    );
  }
};
var TemplatesNamespace = class {
  constructor(api) {
    this.api = api;
  }
  api;
  get(id, options = {}) {
    return withRetries(() => this.api.templatesGet({ id }, callInit(void 0, options)));
  }
  create(body, options = {}) {
    return withRetries(
      (key) => this.api.templatesCreate({ createTemplateInput: body }, callInit(key, options)),
      { write: true, callOptions: options }
    );
  }
  validate(body, options = {}) {
    return withRetries(
      (key) => this.api.templatesValidate({ createTemplateInput: body }, callInit(key, options)),
      { write: true, callOptions: options }
    );
  }
  update(id, body, options = {}) {
    return withRetries(
      (key) => this.api.templatesUpdate({ id, updateTemplateInput: body }, callInit(key, options)),
      { write: true, callOptions: options }
    );
  }
  list(query = {}, options = {}) {
    return withRetries(
      () => this.api.templatesList(templateQuery(query), callInit(void 0, options))
    );
  }
  /** Pages on the caller's behalf; a cursor never reaches them. The timeout is per page. */
  async *listAll(query = {}, options = {}) {
    const base = templateQuery(query);
    let startingAfter;
    for (; ; ) {
      const page = await withRetries(
        () => this.api.templatesList({ ...base, startingAfter }, callInit(void 0, options))
      );
      for (const item of page.data) yield item;
      const last = page.data.at(-1);
      if (!page.hasMore || !last) return;
      startingAfter = last.id;
    }
  }
};

// src/webhooks.ts
import { createHmac, timingSafeEqual } from "crypto";
var SIGNATURE_HEADER = "x-msgeasy-signature";
var DEFAULT_TOLERANCE_SECONDS = 300;
function headerValue(headers) {
  if (headers === void 0 || headers === null) return headers;
  if (typeof headers === "string" || Array.isArray(headers)) return headers;
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(SIGNATURE_HEADER);
  }
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === SIGNATURE_HEADER) return value;
  }
  return void 0;
}
function verifyWebhookSignature(body, headers, secret, options = {}) {
  if (!secret) return { ok: false, reason: "no_secret_configured" };
  const header = headerValue(headers);
  if (Array.isArray(header)) return { ok: false, reason: "malformed_header" };
  if (typeof header !== "string" || header === "") return { ok: false, reason: "missing_header" };
  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = Math.floor((options.nowMs ?? Date.now()) / 1e3);
  const pairs = header.split(",").map((piece) => {
    const [key, ...rest] = piece.trim().split("=");
    return [key, rest.join("=")];
  });
  if (pairs.filter(([key]) => key === "v1").length !== 1) {
    return { ok: false, reason: "malformed_header" };
  }
  const parts = new Map(pairs);
  const timestamp = Number(parts.get("t"));
  const received = parts.get("v1");
  if (!Number.isFinite(timestamp) || !received) return { ok: false, reason: "malformed_header" };
  if (Math.abs(now - timestamp) > tolerance) return { ok: false, reason: "stale_timestamp" };
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}
export {
  APIConnectionError,
  APIError,
  AuthenticationError,
  BadEnvelopeError,
  ErrorCode,
  IdempotencyError,
  InvalidRequestError,
  MetaError,
  MsgEasy,
  MsgEasyError,
  NotFoundError,
  PermissionDeniedError,
  QuotaError,
  RateLimitError,
  SIGNATURE_HEADER,
  ServiceUnavailableError,
  SetupRequiredError,
  TemplateError,
  TestKeyError,
  ValidationError,
  WindowExpiredError,
  verifyWebhookSignature
};
//# sourceMappingURL=index.js.map