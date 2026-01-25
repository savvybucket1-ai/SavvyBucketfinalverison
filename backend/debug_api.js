async function checkApi() {
    try {
        console.log("Fetching products...");
        const res = await fetch('http://localhost:5000/api/products/buyer/list');
        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("Data Type:", typeof data);
            console.log("Is Array:", Array.isArray(data));
            console.log("Count:", data.length);
            if (data.length > 0) {
                console.log("First Product:", JSON.stringify(data[0], null, 2));
            } else {
                console.log("No products found.");
            }
        } else {
            console.log("Response not OK");
        }
    } catch (err) {
        console.error("Error fetching API:", err.message);
    }
}

checkApi();
