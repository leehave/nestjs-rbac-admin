/* global window */
(function (window) {
  var HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

  function sampleValue(schema, name) {
    if (schema && schema.default !== undefined) return schema.default;
    if (schema && schema.enum && schema.enum.length) return schema.enum[0];

    var lower = String(name || '').toLowerCase();
    if (lower === 'pagenum' || lower === 'page') return 1;
    if (lower === 'pagesize' || lower === 'limit') return 10;
    if (lower === 'tenant_id' || lower === 'tenantid') return 1;
    if (lower === 'id' || lower.endsWith('id')) return 1;
    if (lower === 'key') return 'test';

    if (!schema) return 'test';

    switch (schema.type) {
      case 'integer':
      case 'number':
        return 1;
      case 'boolean':
        return true;
      case 'string':
        if (schema.format === 'date-time') return new Date().toISOString();
        return '';
      default:
        return 'test';
    }
  }

  function resolveSchema(schema, schemas, depth) {
    if (!schema || depth > 6) return schema;
    if (schema.$ref) {
      var refName = schema.$ref.replace('#/components/schemas/', '');
      return resolveSchema(schemas[refName], schemas, depth + 1);
    }
    if (schema.allOf) {
      var merged = { type: 'object', properties: {}, required: [] };
      schema.allOf.forEach(function (part) {
        var resolved = resolveSchema(part, schemas, depth + 1) || {};
        Object.assign(merged.properties, resolved.properties || {});
        if (resolved.required) merged.required = merged.required.concat(resolved.required);
      });
      return merged;
    }
    return schema;
  }

  function sampleSchemaValue(schema, schemas, depth) {
    schema = resolveSchema(schema, schemas, depth || 0) || schema;
    if (!schema) return null;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum && schema.enum.length) return schema.enum[0];

    if (schema.type === 'array') {
      return schema.items ? [sampleSchemaValue(schema.items, schemas, (depth || 0) + 1)] : [];
    }

    if (schema.type === 'object' || schema.properties) {
      var obj = {};
      var required = schema.required || [];
      Object.keys(schema.properties || {}).forEach(function (key) {
        if (required.indexOf(key) >= 0) {
          obj[key] = sampleSchemaValue(schema.properties[key], schemas, (depth || 0) + 1);
        }
      });
      return obj;
    }

    switch (schema.type) {
      case 'integer':
      case 'number':
        return 1;
      case 'boolean':
        return true;
      case 'string':
        if (schema.format === 'date-time') return new Date().toISOString();
        return '';
      default:
        return null;
    }
  }

  function sampleRequestBody(requestBody, schemas) {
    var content = requestBody.content || {};
    var jsonSchema = (content['application/json'] || content['application/*+json'] || {}).schema;
    if (!jsonSchema) return {};
    return sampleSchemaValue(jsonSchema, schemas, 0) || {};
  }

  function parseOpenApi(spec) {
    var schemas = (spec.components && spec.components.schemas) || {};
    var apis = [];

    Object.keys(spec.paths || {}).forEach(function (path) {
      var pathItem = spec.paths[path];
      HTTP_METHODS.forEach(function (method) {
        var op = pathItem[method];
        if (!op) return;

        var pathParams = [];
        var query = [];
        var seenPath = {};

        (op.parameters || []).forEach(function (param) {
          if (param.in === 'path') {
            pathParams.push({
              name: param.name,
              description: param.description || '',
              value: String(sampleValue(param.schema, param.name)),
            });
            seenPath[param.name] = true;
          } else if (param.in === 'query') {
            query.push({
              name: param.name,
              description: param.description || '',
              value: param.required || ['pageNum', 'pageSize', 'page', 'limit'].indexOf(param.name) >= 0
                ? String(sampleValue(param.schema, param.name))
                : '',
            });
          }
        });

        var matches = path.match(/\{([^}]+)\}/g) || [];
        matches.forEach(function (token) {
          var name = token.slice(1, -1);
          if (!seenPath[name]) {
            pathParams.push({
              name: name,
              description: 'path',
              value: String(sampleValue(null, name)),
            });
          }
        });

        var body = null;
        if (op.requestBody) {
          body = sampleRequestBody(op.requestBody, schemas);
        }

        if (path === '/api/core/login' && method === 'post' && !body) {
          body = { username: 'admin', password: 'Admin@123', tenant_id: 1, code: '', uuid: '' };
        }

        var needsAuth = !!(op.security && op.security.length);
        var group = (op.tags && op.tags[0]) || 'default';
        var upperMethod = method.toUpperCase();

        apis.push({
          group: group,
          name: op.summary || op.operationId || upperMethod + ' ' + path,
          method: upperMethod,
          path: path,
          description: (op.description || op.summary || path) + (needsAuth ? ' · 需要 Bearer Token' : ''),
          query: query,
          pathParams: pathParams,
          body: body,
          needsAuth: needsAuth,
        });
      });
    });

    apis.sort(function (a, b) {
      return a.group.localeCompare(b.group, 'zh-CN') || a.path.localeCompare(b.path) || a.method.localeCompare(b.method);
    });

    return apis;
  }

  function loadOpenApiSpec(baseUrl) {
    var root = String(baseUrl || '').replace(/\/+$/, '');
    var candidates = [
      root + '/public/openApi.json',
      '/public/openApi.json',
      '../public/openApi.json',
    ];
    var unique = candidates.filter(function (url, index) {
      return candidates.indexOf(url) === index;
    });

    function tryNext(index) {
      if (index >= unique.length) {
        return Promise.reject(new Error('无法加载 openApi.json，请先启动服务并开启 Swagger'));
      }
      var url = unique[index];
      return fetch(url, { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).catch(function () {
        return tryNext(index + 1);
      });
    }

    return tryNext(0).then(parseOpenApi);
  }

  window.OpenApiLoader = {
    loadOpenApiSpec: loadOpenApiSpec,
    parseOpenApi: parseOpenApi,
  };
})(window);
