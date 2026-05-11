const request: any = { headers: {} };
const override = request?.headers?.['x-platform']?.toLowerCase();
console.log(override);
