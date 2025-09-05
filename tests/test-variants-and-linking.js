/*
 Test script: Reset variants, create new ones, link to items 7, 9, 10, and verify

 Usage:
   node tests/test-variants-and-linking.js

 Env:
   API_BASE_URL (default: http://localhost:4001/api)

 Steps:
 1) Delete all existing variants
 2) Create three variants: "Small", "Medium", "Large" with measurement objects
 3) Link them to item_id 7 and verify
 4) Link them to item_id 9 and 10 (no unlink) and verify
*/

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4001/api';

async function getAllVariants() {
  const res = await axios.get(`${BASE_URL}/variants`);
  return res.data;
}

async function deleteVariant(variantId) {
  await axios.delete(`${BASE_URL}/variants/${variantId}`);
}

async function createVariant(name, description = null) {
  const res = await axios.post(`${BASE_URL}/variants`, { name, description });
  return res.data; // object with id or _id
}

async function getAllItems() {
  const res = await axios.get(`${BASE_URL}/items`);
  return res.data;
}

async function linkVariants(itemId, ids) {
  const res = await axios.post(`${BASE_URL}/items/${itemId}/variants`, { variant_ids: ids });
  return res.data; // { item_id, variant_ids }
}

function getVariantId(v) {
  return v.id != null ? v.id : v._id;
}

async function deleteAllVariants() {
  const all = await getAllVariants();
  if (!Array.isArray(all) || all.length === 0) {
    console.log('No existing variants to delete.');
    return;
  }
  console.log(`Deleting ${all.length} existing variants ...`);
  for (const v of all) {
    const vid = getVariantId(v);
    await deleteVariant(vid);
  }
}

async function main() {
  try {
    console.log(`Using API base: ${BASE_URL}`);

    // 1) Delete all existing variants
    await deleteAllVariants();

    // 2) Create main variants with measurement objects in description
    const dataset = [
      {
        name: 'Small',
        description: { size_in_inches: '24 * 8 * 4', size_in_mm: '600 x 200 x 100', bricks_per_m3: 83 }
      },
      {
        name: 'Medium',
        description: { size_in_inches: '24 * 8 * 6', size_in_mm: '600 x 200 x 150', bricks_per_m3: 56 }
      },
      {
        name: 'Large',
        description: { size_in_inches: '24 * 8 * 8', size_in_mm: '600 x 200 x 200', bricks_per_m3: 42 }
      }
    ];

    const created = [];
    for (const entry of dataset) {
      const v = await createVariant(entry.name, entry.description);
      created.push(v);
      console.log('Created variant:', v);
    }

    const variantNames = dataset.map(d => d.name);
    const variantIds = created.map(getVariantId);

    // 3) Link to item_id 7 and verify
    const verifyAndLinkIds = async (itemId) => {
      console.log(`\nLinking variants ${variantIds.join(', ')} to item_id ${itemId} ...`);
      await linkVariants(itemId, variantIds);
      const items = await getAllItems();
      const target = items.find(i => i.item_id === itemId);
      if (!target) throw new Error(`Item ${itemId} not found in GET /api/items`);
      console.log(`Item ${itemId} variants after link:`, target.variants);
      const hasAll = variantNames.every(n => (target.variants || []).includes(n));
      if (!hasAll) throw new Error(`Item ${itemId} variants missing. Expected: ${variantNames} Got: ${JSON.stringify(target.variants)}`);
    };

    await verifyAndLinkIds(7);

    // 4) Link to item_id 9 and 10 (no unlink)
    await verifyAndLinkIds(9);
    await verifyAndLinkIds(10);

    console.log('\nAll requested link operations succeeded ✅');
  } catch (err) {
    console.error('Test failed ❌:', err.response?.data || err.message || err);
    process.exitCode = 1;
  }
}

main(); 