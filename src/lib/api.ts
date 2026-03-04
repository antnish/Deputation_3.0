const API_URL = "https://script.google.com/macros/s/AKfycbwNibttN_UDKbhMsva3n6qZkbVlx45svpO5BZ7xe9e39Q-qRSwN7rv4_0SCyNWASvdm2A/exec";

export function jsonpRequest(params: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    (window as any)[callbackName] = (payload: any) => {
      resolve(payload);
      delete (window as any)[callbackName];
      script.remove();
    };

    const query = new URLSearchParams({ ...params, callback: callbackName }).toString();
    const script = document.createElement("script");
    script.src = `${API_URL}?${query}`;

    script.onerror = () => {
      delete (window as any)[callbackName];
      script.remove();
      reject(new Error("Unable to load data from server"));
    };

    document.body.appendChild(script);
  });
}

export async function postRequest(payload: any) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
}
