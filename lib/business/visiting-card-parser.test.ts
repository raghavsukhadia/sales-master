import { describe, expect, it } from "vitest";
import {
  extractAllPhones,
  extractState,
  parseVisitingCardText,
  parseVisitingCardTextWithMeta,
} from "./visiting-card-parser";

describe("parseVisitingCardText", () => {
  it("parses a Nagpur visiting card fixture", () => {
    const text = `
Car Editing & Detailing
Deal in All Types of Car Accessories & Parts
Shop No. 15, MIDB School Complex, Near Naka Petrol Pump, Wardhaman Nagar, Nagpur-08
Mob: 9876543210
`;

    const result = parseVisitingCardText(text, 0.8);

    expect(result.businessName).toBe("Car Editing & Detailing");
    expect(result.phone).toBe("9876543210");
    expect(result.address).toContain("Shop No. 15");
    expect(result.city).toBe("Nagpur");
    expect(result.state).toBe("Maharashtra");
    expect(result.pincode).toBe("440008");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("parses garbled OCR from Car Editing card with petrol pump address", () => {
    const text = `
( 9022779628 pe &
Car Editing & Detailing
Deal in All Types of Car Accessories & Parts
9022779628 9834765469
9 9834765469, C O ti Te t ogo, 8 shop No. 16, MSB School Compound, Near Mehta Petrol Pump,, | Wardhman Nagar, Nagpur-08
`;

    const { extraction, phones } = parseVisitingCardTextWithMeta(text, 0.65);

    expect(extraction.businessName).toContain("Car Editing");
    expect(extraction.state).toBe("Maharashtra");
    expect(extraction.city).toBe("Nagpur");
    expect(extraction.pincode).toBe("440008");
    expect(phones).toEqual(["9022779628", "9834765469"]);
    expect(extraction.phone).toBe("9022779628");
    expect(extraction.address).toMatch(/^shop No\. 16/i);
    expect(extraction.address).not.toMatch(/^\d/);
  });

  it("extracts email and pincode", () => {
    const text = `
Sharma Auto
12 MG Road, Indore, Madhya Pradesh 452001
info@sharmaauto.com
+91 9988776655
`;

    const result = parseVisitingCardText(text, 0.7);

    expect(result.businessName).toBe("Sharma Auto");
    expect(result.email).toBe("info@sharmaauto.com");
    expect(result.pincode).toBe("452001");
    expect(result.state).toBe("Madhya Pradesh");
    expect(result.phone).toBe("9988776655");
  });

  it("extracts contact person with honorific", () => {
    const text = `
Royal Accessories
Mr. Rajesh Sharma
Nagpur, Maharashtra
9822012345
`;

    const result = parseVisitingCardText(text, 0.6);

    expect(result.contactPerson).toBe("Mr. Rajesh Sharma");
    expect(result.state).toBe("Maharashtra");
    expect(result.city).toBe("Nagpur");
  });

  it("returns low confidence for empty text", () => {
    const result = parseVisitingCardText("", 0);
    expect(result.businessName).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("does not pick garbled phone line as business name", () => {
    const text = `
( 9022779628 pe &
Car Editing & Detailing
Shop No. 16, Nagpur-08
9022779628
`;

    const result = parseVisitingCardText(text, 0.6);
    expect(result.businessName).toBe("Car Editing & Detailing");
  });
});

describe("extractState", () => {
  it("does not match mp inside petrol pump", () => {
    expect(extractState("Near Mehta Petrol Pump, Wardhaman Nagar, Nagpur")).toBeNull();
  });

  it("matches explicit state names", () => {
    expect(extractState("Indore, Madhya Pradesh 452001")).toBe("Madhya Pradesh");
    expect(extractState("Nagpur, Maharashtra")).toBe("Maharashtra");
  });
});

describe("extractAllPhones", () => {
  it("extracts multiple unique phones", () => {
    const text = "Mob: 9876543210\nTel: 9822012345";
    expect(extractAllPhones(text)).toEqual(["9876543210", "9822012345"]);
  });

  it("extracts both numbers from visiting card header", () => {
    const text = "9022779628 9834765469";
    expect(extractAllPhones(text)).toEqual(["9022779628", "9834765469"]);
  });
});
