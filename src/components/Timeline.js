import React, { useEffect, useState, useMemo } from "react";
import {
    DndContext,
    useSensor,
    useSensors,
    PointerSensor,
    closestCenter,
    useDraggable,
    useDroppable,
    DragOverlay
} from "@dnd-kit/core";
import { Dialog } from "@headlessui/react";
import assignLanes from "../utils/assignLanes";
import timelineItems from "./../data/timelineItems"; 

const columns = [
    { id: "upcoming", label: "📅 Upcoming", initialStatus: true },
    { id: "in_progress", label: "🚧 In Progress" },
    { id: "to_review", label: "📝 To Review" },
    { id: "done", label: "✅ Done" },
];

const daysBetween = (start, end) => (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

function TimelineCard({ item, zoom, timelineStart, onDrop, onUpdate, onDelete, top }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ 
        id: item.id, 
        data: { 
            id: item.id,
            type: "TIMELINE_CARD",
            status: item.status 
        } 
    });

    const offset = daysBetween(timelineStart, item.start);
    const width = daysBetween(item.start, item.end) + 1;
    const deltaX = transform?.x || 0;
    const deltaDays = Math.round(deltaX / zoom);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [form, setForm] = useState(item);

    const handleSave = () => {
        onUpdate(item.id, form);
        setIsEditOpen(false);
    };

    return (
        <>
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            onMouseUp={() => deltaDays !== 0 && onDrop(item.id, deltaDays)}
            className="absolute bg-blue-600 text-white rounded-md shadow border border-blue-700 px-3 py-2 cursor-grab z-10 text-sm min-w-[120px] max-w-[300px] break-words"
            style={{
            left: offset * zoom + deltaX,
            width: width * zoom,
            top: `${top}px`,
            transition: transform ? "none" : "left 0.2s ease"
            }}
            onDoubleClick={() => setIsEditOpen(true)}
        >
            <div className="font-semibold">{item.name}</div>
            <div className="text-xs opacity-90">{item.start} → {item.end}</div>
            
            <button onClick={() => onDelete(item.id)} className="text-xs text-red-300 mt-1 hover:text-red-500">Delete</button>
        </div>

        <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded shadow p-6 w-full max-w-md">
                <Dialog.Title className="text-lg font-semibold mb-4">Edit Card</Dialog.Title>
                <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border px-3 py-2 rounded" />
                <input type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className="border px-3 py-2 rounded" />
                <input type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} className="border px-3 py-2 rounded" />
                <textarea placeholder="Description" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className="border px-3 py-2 rounded" />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
                </form>
            </Dialog.Panel>
            </div>
        </Dialog>
        </>
    );
}

export default function Timeline() {
    const [zoom, setZoom] = useState(12);
    const [items, setItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ name: "", start: "", end: "", status: "upcoming" });
    const [activeId, setActiveId] = useState(null);
    const [activeItem, setActiveItem] = useState(null);

    const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
        distance: 8,
    },
    }));

    // Memoize data from start
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (items.length === 0) {
        return {
        timelineStart: new Date(),
        timelineEnd: new Date(),
        totalDays: 0
        };
    }

    const start = new Date(Math.min(...items.map(i => new Date(i.start))));
    const end = new Date(Math.max(...items.map(i => new Date(i.end))));
    return {
        timelineStart: start,
        timelineEnd: end,
        totalDays: daysBetween(start, end)
    };
    }, [items]);


    // Load initial data from localStorage
    useEffect(() => {
        const loadItems = () => {
            try {
                const saved = localStorage.getItem("timelineItems");
                let loadedItems = timelineItems;

                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                    loadedItems = parsed;
                    }
                }

                const preparedItems = loadedItems.map(item => ({
                    ...item,
                    status: item.status || "upcoming"
                }));

                setItems(preparedItems);
            } catch (error) {
                console.error("Failed to load items:", error);
                setItems(timelineItems.map(item => ({ ...item, status: "upcoming" })));
            }
        };

        loadItems();
    }, []);


    // Saves when data is changed to localStorage
    useEffect(() => {
        localStorage.setItem("timelineItems", JSON.stringify(items));
    }, [items]);

    // Move items horizontally
    const handleShift = (id, delta) => {
    setItems(prev =>
        prev.map(i =>
        i.id === id
            ? { ...i, start: addDays(i.start, delta), end: addDays(i.end, delta) }
            : i
        )
    );
    };

    const handleUpdate = (id, updates) => {
        setItems(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)));
    };

    const handleDelete = (id) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!form.name || !form.start || !form.end) return;

        const newItem = {
            id: Date.now(),
            ...form,
            description: form.description || ""
        };

        setItems((prev) => [...prev, newItem]);
        setForm({ name: "", start: "", end: "", status: "upcoming", description: "" });
        setIsModalOpen(false);
    };

    // DRAG AND DROP LOGICS
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
        setActiveItem(items.find(item => item.id === event.active.id));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over || !active) return;
    
        const activeId = active.id;
        const overId = over.id;
    
        // Check if `over.id` corresponds to a column
        const isDroppingInColumn = columns.some(col => col.id === overId);
        if (!isDroppingInColumn) return;
    
        // Update item status
        setItems((prevItems) =>
            prevItems.map((item) =>
                item.id === activeId ? { ...item, status: overId } : item
            )
        );
    };
        

    const lanes = useMemo(() => assignLanes(items), [items]);

    // DRAGGABLE CARD
    function DraggableCard({ item }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: item.id,
        data: {
            id: item.id,
            status: item.status,
        },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className="bg-blue-100 text-sm px-2 py-1 rounded shadow-sm cursor-grab hover:bg-blue-200 transition-colors"
        >
            {item.name}
        </div>
    );
    }

    return (
    <div className="p-6 space-y-6 font-sans bg-gray-50 min-h-screen">
        {/* TOP BUTTONS SECTION */}
        <div className="flex gap-3 items-center flex-wrap justify-between">
        <div className="flex gap-2">
            <button onClick={() => setZoom(z => z + 5)} className="bg-blue-700 text-white px-4 py-1.5 rounded-md shadow-sm hover:bg-blue-800">Zoom In</button>
            <button onClick={() => setZoom(z => Math.max(5, z - 5))} className="bg-blue-700 text-white px-4 py-1.5 rounded-md shadow-sm hover:bg-blue-800">Zoom Out</button>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700">+ New Card</button>
        </div>

        {/* HORIZONTAL TIMELINE WITH CARDS (ABOVE) */}
        <div className="overflow-x-auto border rounded shadow bg-white">
        <div
            className="relative"
            style={{
            height: `${lanes.length * 120 + 80}px`,
            minWidth: `${totalDays * zoom}px`,
            backgroundSize: `${zoom}px 100%`,
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px)`,
            }}
        >
            {lanes.map((lane, laneIndex) =>
            lane.map(item => (
                <TimelineCard
                key={item.id}
                item={item}
                zoom={zoom}
                timelineStart={timelineStart}
                onDrop={handleShift}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                top={laneIndex * 120}
                />
            ))
            )}
        </div>
        </div>

        {/* SECTIONS (BELOW TIMELINE) */}
        <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        >
        <div className="grid grid-cols-4 gap-6">
            {columns.map((col) => {
            const { setNodeRef } = useDroppable({
                id: col.id,
                data: { accepts: ["COLUMN_CARD", "TIMELINE_CARD"] }
            });
            
            const colItems = items.filter(item => item.status === col.id);

            return (
                <div
                key={col.id}
                ref={setNodeRef}
                id={col.id}
                className="bg-white border rounded-lg shadow-sm p-4 min-h-[200px] flex flex-col gap-2"
                >
                <h3 className="text-lg font-semibold mb-2">{col.label}</h3>
                {colItems
                .filter(item => item.id !== activeId)
                .map((item) => (
                    <DraggableCard key={item.id} item={item} />
                ))}
                </div>
            );
            })}
        </div>

        <DragOverlay>
            {activeId ? (
                <div className="bg-blue-100 text-sm px-2 py-1 rounded shadow-sm cursor-grabbing opacity-90">
                {items.find(i => i.id === activeId)?.name}
                </div>
            ) : null}
        </DragOverlay>


        </DndContext>

        {/* CREATE ITEM MODAL */}
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded shadow p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-semibold mb-4">Create New Card</Dialog.Title>
            <form className="flex flex-col gap-3" onSubmit={handleAddItem}>
            <input required type="text" placeholder="Title" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border px-3 py-2 rounded" />
            <input required type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className="border px-3 py-2 rounded" />
            <input required type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} className="border px-3 py-2 rounded" />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border px-3 py-2 rounded">
                {columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <textarea placeholder="Description" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className="border px-3 py-2 rounded" />
            <button type="submit" className="bg-green-600 text-white py-2 rounded hover:bg-green-700">Create</button>
            </form>
        </Dialog.Panel>
        </div>
    </Dialog>
    </div>
);
}