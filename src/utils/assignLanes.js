export default function assignLanes(items) {
    const sorted = [...items].sort((a, b) => new Date(a.start) - new Date(b.start));
    const lanes = [];

    for (const item of sorted) {
    const itemStart = new Date(item.start);
    const itemEnd = new Date(item.end);

    let placed = false;

    for (const lane of lanes) {
        const overlaps = lane.some(existing => {
        const existingStart = new Date(existing.start);
        const existingEnd = new Date(existing.end);

        return !(itemEnd < existingStart || itemStart > existingEnd);
        });

        if (!overlaps) {
        lane.push(item);
        placed = true;
        break;
        }
    }

    if (!placed) {
        lanes.push([item]);
    }
    }

    return lanes;
}
