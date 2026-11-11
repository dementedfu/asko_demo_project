import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Camera, ImagePlus, Trash2, ZoomIn, RefreshCw } from "lucide-react";
import { db, storePhoto, removePhoto, replacePhoto } from "../data/db";
import type { Photo, Purpose } from "../domain/model";
import { useApp } from "./context";
import { Confirm, Modal } from "./common";
function PhotoImage({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const [url, setUrl] = useState(photo.asset ?? "");
  useEffect(() => {
    if (!photo.blob) return;
    const next = URL.createObjectURL(photo.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo.blob]);
  return (
    <button
      className="photo-open"
      type="button"
      onClick={onOpen}
      aria-label={"Открыть фото: " + photo.name}
    >
      <img src={url} alt={photo.name} />
      <ZoomIn size={16} />
      {photo.zone && <span className="photo-zone-label">{photo.zone}</span>}
    </button>
  );
}
async function prepare(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Поддерживаются JPEG, PNG и WebP. HEIC предварительно сохраните как JPEG.",
    );
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Размер исходного файла — не больше 5 МБ");
  const image = await createImageBitmap(file).catch(() => {
    throw new Error("Файл не удалось прочитать как изображение");
  });
  if (Math.max(image.width, image.height) <= 1600) {
    image.close();
    return file;
  }
  const scale = 1600 / Math.max(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Не удалось подготовить фотографию")),
      "image/jpeg",
      0.86,
    ),
  );
}
export function PhotoGallery({
  orderId,
  pairId,
  purpose,
  editable = false,
  removable = true,
}: {
  orderId: string;
  pairId: string;
  purpose: Purpose;
  editable?: boolean;
  removable?: boolean;
}) {
  const { session, run, busy } = useApp();
  const photos =
    useLiveQuery(
      () =>
        db.photos.where("[pairId+purpose]").equals([pairId, purpose]).toArray(),
      [pairId, purpose],
    ) ?? [];
  const [zone, setZone] = useState("");
  const [deleting, setDeleting] = useState<Photo>(),
    [viewing, setViewing] = useState<Photo>(),
    [viewUrl, setViewUrl] = useState("");
  useEffect(() => {
    if (!viewing) return;
    if (viewing.asset) {
      setViewUrl(viewing.asset);
      return;
    }
    if (viewing.blob) {
      const url = URL.createObjectURL(viewing.blob);
      setViewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [viewing]);
  async function upload(files: FileList | null) {
    if (!files) return;
    await run(async () => {
      for (const file of Array.from(files)) {
        const blob = await prepare(file);
        await storePhoto(
          {
            orderId,
            pairId,
            purpose,
            zone: zone || undefined,
            blob,
            name: file.name,
          },
          session,
        );
      }
    }, "Фото сохранено");
  }
  return (
    <div className="photo-section">
      {editable && (
        <label className="field photo-zone">
          <span>Зона новых фотографий — необязательно</span>
          <select
            aria-label="Зона новых фотографий"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          >
            <option value="">Вся пара</option>
            {["Верх", "Носок", "Пятка", "Подошва", "Внутри"].map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </label>
      )}
      <div className="photo-grid">
        {photos.map((photo) => (
          <div className="photo-tile" key={photo.id}>
            <PhotoImage photo={photo} onOpen={() => setViewing(photo)} />
            {editable && removable && (
              <label className="photo-replace" title="Заменить фото">
                <RefreshCw size={14} />
                <input
                  type="file"
                  aria-label={"Заменить фото " + photo.name}
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void run(async () => {
                        const blob = await prepare(file);
                        await replacePhoto(photo.id, blob, file.name, session);
                      }, "Фото заменено");
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
            {editable && removable && (
              <button
                type="button"
                className="photo-delete"
                aria-label={"Удалить фото " + photo.name}
                onClick={() => setDeleting(photo)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {editable && photos.length < 8 && (
          <label className={"photo-upload " + (busy ? "disabled" : "")}>
            <ImagePlus size={24} />
            <strong>Добавить фото</strong>
            <span>{photos.length}/8 · до 5 МБ</span>
            <input
              type="file"
              aria-label="Загрузить фотографии"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>
      {!photos.length && !editable && (
        <p className="muted text-sm">Фотографии пока не добавлены.</p>
      )}
      {editable && (
        <p className="photo-hint">
          <Camera size={14} /> Общий вид, подошва и проблемное место. Лучше при
          дневном свете.
        </p>
      )}
      {deleting && (
        <Confirm
          title="Удалить фотографию?"
          text="Эту фотографию можно будет добавить заново."
          action="Удалить фото"
          danger
          busy={busy}
          onClose={() => setDeleting(undefined)}
          onConfirm={() =>
            void run(async () => {
              await removePhoto(deleting.id, session);
              setDeleting(undefined);
            }, "Фото удалено")
          }
        />
      )}
      {viewing && (
        <Modal title={viewing.name} wide onClose={() => setViewing(undefined)}>
          <img className="photo-full" src={viewUrl} alt={viewing.name} />
        </Modal>
      )}
    </div>
  );
}
