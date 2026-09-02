import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  Crop,
  Sparkles,
  Sliders,
  Palette,
  Layers,
  Trash2,
  Edit3,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Plus,
  Car,
  Tag,
  Camera,
  Calendar,
  MapPin,
  Check,
  Shield,
  FileImage,
  Paintbrush,
  Download,
  Eye,
  LogOut,
  Search,
  Zap,
  Star,
  FolderUp,
  Images,
  Maximize2,
  X,
  Users,
  Heart,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { CarPhoto, AppThemeConfig, VehicleLookupResult, UserAccount, Photographer, GeneralSettings } from '../types';
import { ImageEditorModal } from './ImageEditorModal';
import { CartoonArtStudio } from './CartoonArtStudio';
import { UserManagementSection } from './UserManagementSection';
import { GeneralSettingsSection } from './GeneralSettingsSection';
import { convertPhotoToCartoonSticker, normalizeMediaForCanvas } from '../utils/cartoonEngine';
import { DEFAULT_THEMES } from '../data/initialData';
import { applyThemeToDocument } from '../utils/themeUtils';
import { formatMediaUrl } from '../utils/apiConfig';

export const US_STATES = [
  { code: '', name: 'Auto-Detect / Any State' },
  { code: 'AL', name: 'Alabama (AL)' },
  { code: 'AK', name: 'Alaska (AK)' },
  { code: 'AZ', name: 'Arizona (AZ)' },
  { code: 'AR', name: 'Arkansas (AR)' },
  { code: 'CA', name: 'California (CA)' },
  { code: 'CO', name: 'Colorado (CO)' },
  { code: 'CT', name: 'Connecticut (CT)' },
  { code: 'DE', name: 'Delaware (DE)' },
  { code: 'FL', name: 'Florida (FL)' },
  { code: 'GA', name: 'Georgia (GA)' },
  { code: 'HI', name: 'Hawaii (HI)' },
  { code: 'ID', name: 'Idaho (ID)' },
  { code: 'IL', name: 'Illinois (IL)' },
  { code: 'IN', name: 'Indiana (IN)' },
  { code: 'IA', name: 'Iowa (IA)' },
  { code: 'KS', name: 'Kansas (KS)' },
  { code: 'KY', name: 'Kentucky (KY)' },
  { code: 'LA', name: 'Louisiana (LA)' },
  { code: 'ME', name: 'Maine (ME)' },
  { code: 'MD', name: 'Maryland (MD)' },
  { code: 'MA', name: 'Massachusetts (MA)' },
  { code: 'MI', name: 'Michigan (MI)' },
  { code: 'MN', name: 'Minnesota (MN)' },
  { code: 'MS', name: 'Mississippi (MS)' },
  { code: 'MO', name: 'Missouri (MO)' },
  { code: 'MT', name: 'Montana (MT)' },
  { code: 'NE', name: 'Nebraska (NE)' },
  { code: 'NV', name: 'Nevada (NV)' },
  { code: 'NH', name: 'New Hampshire (NH)' },
  { code: 'NJ', name: 'New Jersey (NJ)' },
  { code: 'NM', name: 'New Mexico (NM)' },
  { code: 'NY', name: 'New York (NY)' },
  { code: 'NC', name: 'North Carolina (NC)' },
  { code: 'ND', name: 'North Dakota (ND)' },
  { code: 'OH', name: 'Ohio (OH)' },
  { code: 'OK', name: 'Oklahoma (OK)' },
  { code: 'OR', name: 'Oregon (OR)' },
  { code: 'PA', name: 'Pennsylvania (PA)' },
  { code: 'RI', name: 'Rhode Island (RI)' },
  { code: 'SC', name: 'South Carolina (SC)' },
  { code: 'SD', name: 'South Dakota (SD)' },
  { code: 'TN', name: 'Tennessee (TN)' },
  { code: 'TX', name: 'Texas (TX)' },
  { code: 'UT', name: 'Utah (UT)' },
  { code: 'VT', name: 'Vermont (VT)' },
  { code: 'VA', name: 'Virginia (VA)' },
  { code: 'WA', name: 'Washington (WA)' },
  { code: 'WV', name: 'West Virginia (WV)' },
  { code: 'WI', name: 'Wisconsin (WI)' },
  { code: 'WY', name: 'Wyoming (WY)' },
  { code: 'DC', name: 'District of Columbia (DC)' },
  { code: 'ON', name: 'Ontario, Canada (ON)' },
  { code: 'BC', name: 'British Columbia, Canada (BC)' },
  { code: 'QC', name: 'Quebec, Canada (QC)' },
  { code: 'AB', name: 'Alberta, Canada (AB)' },
  { code: 'INTL', name: 'International / Other' },
];

interface AdminPortalProps {
  cars: CarPhoto[];
  onAddCar: (newCar: Partial<CarPhoto>) => Promise<void>;
  onUpdateCar: (id: string, updated: Partial<CarPhoto>) => Promise<void>;
  onDeleteCar: (id: string) => Promise<void>;
  currentTheme: AppThemeConfig;
  onSaveTheme: (theme: AppThemeConfig) => Promise<void>;
  onBackToVisitor: () => void;
  onLogoutAdmin?: () => void;
  adminName?: string;
  adminUser?: UserAccount | null;
  adminToken?: string | null;
  generalSettings?: GeneralSettings;
  onSaveSettings?: (settings: GeneralSettings) => Promise<boolean>;
}

interface StagedPhoto {
  id: string;
  url: string;
  name: string;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  cars,
  onAddCar,
  onUpdateCar,
  onDeleteCar,
  currentTheme,
  onSaveTheme,
  onBackToVisitor,
  onLogoutAdmin,
  adminName = 'Admin Photographer',
  adminUser,
  adminToken,
  generalSettings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'theme' | 'fleet' | 'users' | 'settings'>('upload');
  const [localGeneralSettings, setLocalGeneralSettings] = useState<GeneralSettings | null>(generalSettings || null);

  // Fetch settings from API if not passed
  useEffect(() => {
    if (!generalSettings) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.settings) setLocalGeneralSettings(data.settings);
        })
        .catch(() => {});
    } else {
      setLocalGeneralSettings(generalSettings);
    }
  }, [generalSettings]);

  // Registered Photographers List
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch photographers/users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Upload Form State
  const [plateNumber, setPlateNumber] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [carName, setCarName] = useState<string>('');
  const [make, setMake] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [event, setEvent] = useState<string>('');
  const [location, setLocation] = useState<string>('');

  // Automatically derive photographer attribution from logged-in user session
  const currentPhotographer: Photographer = useMemo(() => {
    if (adminUser) {
      return {
        id: adminUser.id,
        name: adminUser.name || adminName || 'Photographer',
        title: adminUser.role === 'admin' ? 'Lead Automotive Photographer' : 'Automotive Photographer',
        avatar: adminUser.avatar || '',
        bio: adminUser.bio || '',
        venmoHandle: adminUser.venmoHandle || undefined,
        payPalHandle: adminUser.payPalHandle || undefined,
        cashAppHandle: adminUser.cashAppHandle || undefined,
        instagram: adminUser.instagram || undefined,
      };
    }
    return {
      name: adminName || 'Photographer',
      title: 'Automotive Photographer',
      avatar: '',
      bio: '',
      venmoHandle: undefined,
      payPalHandle: undefined,
      cashAppHandle: undefined,
      instagram: undefined,
    };
  }, [adminUser, adminName]);

  const [tagsInput, setTagsInput] = useState<string>('');

  // Multi-image Staging State
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const [activeEditingPhotoIndex, setActiveEditingPhotoIndex] = useState<number>(0);

  const [cartoonImageUrl, setCartoonImageUrl] = useState<string | null>(null);
  const [hasCartoon, setHasCartoon] = useState<boolean>(false);
  const [selectedCartoonPhotoUrl, setSelectedCartoonPhotoUrl] = useState<string | null>(null);
  const [isAutoGeneratingCartoon, setIsAutoGeneratingCartoon] = useState<boolean>(false);
  const [resolution, setResolution] = useState<string>('');
  const [cameraInfo, setCameraInfo] = useState<string>('');

  // Fleet Existing Car Comprehensive Edit Modal State
  const [editingCarGallery, setEditingCarGallery] = useState<CarPhoto | null>(null);
  const [editModalTab, setEditModalTab] = useState<'info' | 'photos'>('info');
  const [editCarName, setEditCarName] = useState<string>('');
  const [editMake, setEditMake] = useState<string>('');
  const [editModel, setEditModel] = useState<string>('');
  const [editYear, setEditYear] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('');
  const [editState, setEditState] = useState<string>('');
  const [editPlateNumber, setEditPlateNumber] = useState<string>('');
  const [editEvent, setEditEvent] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editCameraInfo, setEditCameraInfo] = useState<string>('');
  const [editResolution, setEditResolution] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');
  const [editPhotographerName, setEditPhotographerName] = useState<string>('');
  const [editPhotographerTitle, setEditPhotographerTitle] = useState<string>('');
  const [editPhotographerInstagram, setEditPhotographerInstagram] = useState<string>('');
  const [editPhotographerVenmo, setEditPhotographerVenmo] = useState<string>('');
  const [editPhotographerPayPal, setEditPhotographerPayPal] = useState<string>('');
  const [editPhotographerCashApp, setEditPhotographerCashApp] = useState<string>('');
  const [editCoverImageUrl, setEditCoverImageUrl] = useState<string>('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Sync edit states whenever a car is selected for editing
  useEffect(() => {
    if (editingCarGallery) {
      setEditCarName(editingCarGallery.carName || '');
      setEditMake(editingCarGallery.make || '');
      setEditModel(editingCarGallery.model || '');
      setEditYear(editingCarGallery.year ? String(editingCarGallery.year) : '');
      setEditColor(editingCarGallery.color || '');
      setEditState(editingCarGallery.state || '');
      setEditPlateNumber(editingCarGallery.plateNumber || '');
      setEditEvent(editingCarGallery.event || '');
      setEditLocation(editingCarGallery.location || '');
      setEditDate(editingCarGallery.date || '');
      setEditCameraInfo(editingCarGallery.cameraInfo || '');
      setEditResolution(editingCarGallery.resolution || '');
      setEditTags(Array.isArray(editingCarGallery.tags) ? editingCarGallery.tags.join(', ') : '');
      setEditPhotographerName(editingCarGallery.photographer?.name || '');
      setEditPhotographerTitle(editingCarGallery.photographer?.title || '');
      setEditPhotographerInstagram(editingCarGallery.photographer?.instagram || '');
      setEditPhotographerVenmo(editingCarGallery.photographer?.venmoHandle || '');
      setEditPhotographerPayPal(editingCarGallery.photographer?.payPalHandle || '');
      setEditPhotographerCashApp(editingCarGallery.photographer?.cashAppHandle || '');
      setEditCoverImageUrl(editingCarGallery.imageUrl || '');
      const rawImgs =
        Array.isArray(editingCarGallery.images) && editingCarGallery.images.length > 0
          ? editingCarGallery.images.filter(Boolean)
          : [];
      const cover = editingCarGallery.imageUrl || '';
      const combined =
        cover && !rawImgs.includes(cover)
          ? [cover, ...rawImgs]
          : rawImgs.length > 0
          ? rawImgs
          : cover
          ? [cover]
          : [];
      setEditImages(combined);
      setEditModalTab('info');
    }
  }, [editingCarGallery]);

  // Select car for editing and fetch complete database record with all images
  const handleSelectCarForEdit = async (car: CarPhoto) => {
    setEditingCarGallery(car);
    try {
      const res = await fetch(`/api/cars/${car.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.car) {
          setEditingCarGallery(data.car);
        }
      }
    } catch (err) {
      console.warn('Could not fetch fresh car record for editing:', err);
    }
  };

  // Hidden File Input References
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const manageCarFileInputRef = useRef<HTMLInputElement>(null);

  // Direct Auto-Generation of 2D Cartoon Sticker from specific photo
  const handleAutoGenerateCartoonFromPhoto = async (photoUrl: string) => {
    if (!photoUrl) return;
    setSelectedCartoonPhotoUrl(photoUrl);
    setIsAutoGeneratingCartoon(true);
    setStatusMsg({
      type: 'success',
      text: 'Auto-applying 2D Cartoon vector sticker to selected picture...',
    });

    try {
      const normalized = normalizeMediaForCanvas(photoUrl);
      let resultUrl: string | null = null;

      // 1. Attempt server-side Gemini AI generation
      try {
        const res = await fetch('/api/generate-cartoon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: normalized,
            plateNumber: plateNumber || '',
            carName: carName || `${make} ${model}`,
            make,
            model,
            color,
          }),
        });
        const data = await res.json();
        if (data.dataUrl) {
          resultUrl = data.dataUrl;
        }
      } catch (aiErr) {
        console.warn('Gemini endpoint fallback:', aiErr);
      }

      // 2. If Gemini unavailable or offline, use high-definition canvas cel-shading & inking
      if (!resultUrl) {
        resultUrl = await convertPhotoToCartoonSticker(normalized, {
          edgeThickness: 2,
          edgeThreshold: 26,
          colorSteps: 6,
          saturationBoost: 1.35,
          stickerBorder: true,
        });
      }

      setCartoonImageUrl(resultUrl);
      setHasCartoon(true);
      setStatusMsg({
        type: 'success',
        text: '✨ 2D Cartoon vector sticker successfully auto-generated from selected picture!',
      });
    } catch (err: any) {
      console.error('Failed to auto-generate cartoon:', err);
      setStatusMsg({
        type: 'error',
        text: 'Could not auto-generate cartoon from this photo.',
      });
    } finally {
      setIsAutoGeneratingCartoon(false);
    }
  };

  // Auto-generate cartoon for existing fleet car and save to database
  const handleAutoGenerateForExistingCar = async (car: CarPhoto, photoUrl: string) => {
    if (!photoUrl) return;
    setStatusMsg({
      type: 'success',
      text: `Generating 2D cartoon sticker for [${car.carName || car.make}]...`,
    });

    try {
      const normalized = normalizeMediaForCanvas(photoUrl);
      let resultUrl: string | null = null;

      try {
        const res = await fetch('/api/generate-cartoon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: normalized,
            plateNumber: car.plateNumber || '',
            carName: car.carName,
            make: car.make,
            model: car.model,
            color: car.color,
          }),
        });
        const data = await res.json();
        if (data.dataUrl) {
          resultUrl = data.dataUrl;
        }
      } catch (e) {
        console.warn('Fallback to algorithmic generator for existing car:', e);
      }

      if (!resultUrl) {
        resultUrl = await convertPhotoToCartoonSticker(normalized, {
          edgeThickness: 2,
          edgeThreshold: 26,
          colorSteps: 6,
          saturationBoost: 1.35,
          stickerBorder: true,
        });
      }

      await onUpdateCar(car.id, {
        cartoonImageUrl: resultUrl,
        hasCartoon: true,
      });

      if (editingCarGallery && editingCarGallery.id === car.id) {
        setEditingCarGallery({
          ...editingCarGallery,
          cartoonImageUrl: resultUrl,
          hasCartoon: true,
        });
      }

      setStatusMsg({
        type: 'success',
        text: `✨ Successfully updated [${car.carName || car.make}] with a custom 2D Cartoon Sticker!`,
      });
    } catch (err: any) {
      console.error('Error creating cartoon for existing car:', err);
      setStatusMsg({
        type: 'error',
        text: 'Failed to update existing car cartoon sticker.',
      });
    }
  };

  // Online Plate Auto-Lookup State
  const [isLookingUpPlate, setIsLookingUpPlate] = useState<boolean>(false);
  const [lookupFeedback, setLookupFeedback] = useState<{
    source: string;
    details: string;
  } | null>(null);

  // Auto-fill car details from plate lookup API
  const handleAutoFillPlate = async (targetPlate?: string) => {
    const queryPlate = (targetPlate || plateNumber).trim();
    if (!queryPlate || queryPlate.length < 2) {
      setStatusMsg({ type: 'error', text: 'Please enter at least 2 characters of a plate or VIN to lookup.' });
      return;
    }

    setIsLookingUpPlate(true);
    setLookupFeedback(null);

    try {
      const stateParam = selectedState ? `&state=${encodeURIComponent(selectedState)}` : '';
      const response = await fetch(`/api/lookup-plate?plate=${encodeURIComponent(queryPlate)}${stateParam}`);
      const data = await response.json();

      if (data.success && (data.vehicle || data.data)) {
        const v = data.vehicle || data.data;
        if (v.make) setMake(v.make);
        if (v.model) setModel(v.model);
        if (v.year) setYear(String(v.year));
        if (v.color) setColor(v.color);
        if (v.make && v.model) {
          setCarName(`${v.make} ${v.model}`);
        }
        if (v.state && !selectedState) {
          setSelectedState(v.state);
        }
        if (Array.isArray(v.suggestedTags) && v.suggestedTags.length > 0) {
          setTagsInput(v.suggestedTags.join(', '));
        }

        setLookupFeedback({
          source: data.source || v.source || 'Online Registry',
          details: `${v.make} ${v.model} (${v.year || ''}) - ${v.engine || ''}`,
        });

        setStatusMsg({
          type: 'success',
          text: `✨ Auto-filled vehicle specs for [${queryPlate.toUpperCase()}${selectedState ? ` (${selectedState})` : ''}] via ${data.source || v.source || 'NHTSA / Registry'}!`,
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'No online vehicle record found for this plate. You can manually enter make and model.',
        });
      }
    } catch (err: any) {
      console.error('Plate lookup error:', err);
      setStatusMsg({
        type: 'error',
        text: 'Plate lookup service unavailable. You can enter details manually.',
      });
    } finally {
      setIsLookingUpPlate(false);
    }
  };

  // Modals
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isCartoonStudioOpen, setIsCartoonStudioOpen] = useState<boolean>(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Theme Customizer State
  const [themeForm, setThemeForm] = useState<AppThemeConfig>({ ...currentTheme });
  const [themeSavedToast, setThemeSavedToast] = useState<boolean>(false);

  useEffect(() => {
    if (currentTheme) {
      setThemeForm({ ...currentTheme });
    }
  }, [currentTheme]);

  // Process a list of File objects (from multi-select, folder input, or drag-and-drop)
  const handleFilesAdded = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|tiff|gif)$/i.test(f.name)
    );

    if (fileArray.length === 0) {
      setStatusMsg({ type: 'error', text: 'No supported image files found in selection.' });
      return;
    }

    const readers = fileArray.map((file) => {
      return new Promise<StagedPhoto>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: event.target?.result as string,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    try {
      const loaded = await Promise.all(readers);
      setStagedPhotos((prev) => [...prev, ...loaded]);
      setStatusMsg({
        type: 'success',
        text: `📸 Successfully staged ${loaded.length} automotive photo${loaded.length > 1 ? 's' : ''}!`,
      });
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Error reading selected files.' });
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Remove photo from staging list
  const handleRemovePhoto = (id: string, idx: number) => {
    setStagedPhotos((prev) => prev.filter((p) => p.id !== id));
    if (coverIndex >= idx && coverIndex > 0) {
      setCoverIndex(coverIndex - 1);
    }
  };

  // Submit new car to backend
  const handleSubmitCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedPhotos.length === 0) {
      setStatusMsg({ type: 'error', text: 'Please upload at least one photo or a folder of photos.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const coverPhoto = stagedPhotos[coverIndex] || stagedPhotos[0];
      const allImagesUrls = stagedPhotos.map((p) => p.url);
      const cleanPlate = (plateNumber || '').toUpperCase().trim();
      const effectiveCarName = carName.trim() || (make.trim() ? `${make.trim()} ${model.trim()}`.trim() : '');

      // Use automatically resolved photographer attribution from authenticated session
      const photogObject: Photographer = currentPhotographer;

      // Create photo authors mapping
      const photoAuthorsMap: Record<string, Photographer> = {};
      allImagesUrls.forEach((url) => {
        photoAuthorsMap[url] = photogObject;
      });

      await onAddCar({
        plateNumber: cleanPlate || undefined,
        state: selectedState ? selectedState.toUpperCase().trim() : undefined,
        carName: effectiveCarName || 'Vehicle',
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        year: year.trim() ? parseInt(year.trim(), 10) || undefined : undefined,
        color: color.trim() || undefined,
        event: event.trim() || undefined,
        location: location.trim() || undefined,
        photographer: photogObject,
        photoAuthors: photoAuthorsMap,
        imageUrl: coverPhoto.url,
        images: allImagesUrls,
        cartoonImageUrl: cartoonImageUrl || undefined,
        hasCartoon: Boolean(hasCartoon || cartoonImageUrl),
        tags: tagsArray,
        resolution: resolution.trim() || undefined,
        cameraInfo: cameraInfo.trim() || undefined,
      });

      setStatusMsg({
        type: 'success',
        text: `Successfully published ${allImagesUrls.length} photos for [${effectiveCarName || 'Vehicle'}]! It is now searchable in the visitor dashboard!`,
      });

      // Reset form
      setPlateNumber('');
      setSelectedState('');
      setMake('');
      setModel('');
      setCarName('');
      setYear('');
      setColor('');
      setEvent('');
      setLocation('');
      setTagsInput('');
      setResolution('');
      setCameraInfo('');
      setStagedPhotos([]);
      setCoverIndex(0);
      setCartoonImageUrl(null);
      setHasCartoon(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to upload car photos' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save all vehicle, shot, and photographer details for existing car
  const handleSaveCarDetails = async () => {
    if (!editingCarGallery) return;
    setIsSavingEdit(true);
    try {
      const tagsArray = editTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const effectiveCover = editCoverImageUrl || editImages[0] || editingCarGallery.imageUrl;

      const updatedPayload: Partial<CarPhoto> = {
        carName: editCarName.trim() || undefined,
        make: editMake.trim() || undefined,
        model: editModel.trim() || undefined,
        year: editYear.trim() ? parseInt(editYear.trim(), 10) || undefined : undefined,
        color: editColor.trim() || undefined,
        state: editState ? editState.toUpperCase().trim() : undefined,
        plateNumber: editPlateNumber ? editPlateNumber.toUpperCase().trim() : undefined,
        event: editEvent.trim() || undefined,
        location: editLocation.trim() || undefined,
        date: editDate.trim() || undefined,
        cameraInfo: editCameraInfo.trim() || undefined,
        resolution: editResolution.trim() || undefined,
        imageUrl: effectiveCover,
        images: editImages,
        tags: tagsArray,
        photographer: {
          ...editingCarGallery.photographer,
          name: editPhotographerName.trim() || editingCarGallery.photographer?.name || 'Photographer',
          title: editPhotographerTitle.trim() || undefined,
          instagram: editPhotographerInstagram.trim() || undefined,
          venmoHandle: editPhotographerVenmo.trim() || undefined,
          payPalHandle: editPhotographerPayPal.trim() || undefined,
          cashAppHandle: editPhotographerCashApp.trim() || undefined,
        },
      };

      await onUpdateCar(editingCarGallery.id, updatedPayload);

      setEditingCarGallery((prev) =>
        prev
          ? {
              ...prev,
              ...updatedPayload,
            } as CarPhoto
          : null
      );

      setStatusMsg({
        type: 'success',
        text: `Vehicle & shot details updated successfully for [${editCarName || editMake || 'Vehicle'}]!`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update vehicle details.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Adding photos to an existing car in fleet
  const handleAddPhotosToExistingCar = async (files: FileList | File[]) => {
    if (!editingCarGallery) return;

    const fileArray = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|tiff|gif)$/i.test(f.name)
    );

    if (fileArray.length === 0) return;

    const readers = fileArray.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    const newUrls = await Promise.all(readers);
    const existingImages = Array.isArray(editImages) && editImages.length > 0
      ? editImages
      : (Array.isArray(editingCarGallery.images) && editingCarGallery.images.length > 0
          ? editingCarGallery.images
          : [editingCarGallery.imageUrl]);

    const updatedImages = [...existingImages, ...newUrls];
    setEditImages(updatedImages);
    if (!editCoverImageUrl && updatedImages.length > 0) {
      setEditCoverImageUrl(updatedImages[0]);
    }

    await onUpdateCar(editingCarGallery.id, { images: updatedImages });

    setEditingCarGallery({
      ...editingCarGallery,
      images: updatedImages,
    });

    setStatusMsg({
      type: 'success',
      text: `Added ${newUrls.length} photos to [${editingCarGallery.carName || 'Vehicle'}]. Total photos: ${updatedImages.length}`,
    });
  };

  // Set cover photo for existing car
  const handleSetCoverPhoto = async (imgUrl: string) => {
    if (!editingCarGallery) return;
    setEditCoverImageUrl(imgUrl);
    await onUpdateCar(editingCarGallery.id, { imageUrl: imgUrl });
    setEditingCarGallery({
      ...editingCarGallery,
      imageUrl: imgUrl,
    });
    setStatusMsg({
      type: 'success',
      text: `Updated primary cover photo for [${editingCarGallery.carName || 'Vehicle'}]!`,
    });
  };

  // Remove photo from existing car
  const handleRemovePhotoFromExistingCar = async (photoIndex: number) => {
    if (!editingCarGallery) return;
    const existingImages = Array.isArray(editImages) && editImages.length > 0
      ? [...editImages]
      : (Array.isArray(editingCarGallery.images) && editingCarGallery.images.length > 0
          ? [...editingCarGallery.images]
          : [editingCarGallery.imageUrl]);

    if (existingImages.length <= 1) {
      setStatusMsg({ type: 'error', text: 'A car must have at least one photo.' });
      return;
    }

    const removedUrl = existingImages.splice(photoIndex, 1)[0];
    const newCover = editCoverImageUrl === removedUrl ? existingImages[0] : editCoverImageUrl;
    setEditImages(existingImages);
    setEditCoverImageUrl(newCover);

    await onUpdateCar(editingCarGallery.id, {
      images: existingImages,
      imageUrl: newCover,
    });

    setEditingCarGallery({
      ...editingCarGallery,
      images: existingImages,
      imageUrl: newCover,
    });
  };

  // Theme Live Preview & Apply
  const handleThemeColorChange = (key: keyof AppThemeConfig, value: any) => {
    const updated = { ...themeForm, [key]: value };
    setThemeForm(updated);
    applyThemeToDocument(updated);
  };

  const handleApplyPreset = (preset: AppThemeConfig) => {
    setThemeForm(preset);
    applyThemeToDocument(preset);
  };

  const handleSaveThemeGlobal = async () => {
    await onSaveTheme(themeForm);
    setThemeSavedToast(true);
    setTimeout(() => setThemeSavedToast(false), 3000);
  };

  const currentCoverPhoto = stagedPhotos[coverIndex] || stagedPhotos[0];

  return (
    <div className="min-h-screen bg-[var(--ps-bg,#000000)] text-[var(--ps-text-main,#ffffff)] pb-24 transition-colors duration-300">
      {/* Top Admin Navigation Bar */}
      <nav className="sticky top-0 z-50 ps-glass-nav bg-[var(--ps-nav-bg,rgba(15,15,18,0.95))] border-b border-[var(--ps-card-border,#2C2C2E)] backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-0 min-h-16 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
          {/* Top Row: Back Button, Portal Title & Logout */}
          <div className="flex items-center justify-between gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onBackToVisitor}
                className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold px-3 sm:px-3.5 py-2 rounded-xl bg-[var(--ps-card-bg,#1C1C1E)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)] transition-all shadow-sm active:scale-95 cursor-pointer group shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-[var(--ps-primary,#0A84FF)] group-hover:text-white transition-colors" />
                <span className="hidden sm:inline">Back to Site</span>
                <span className="sm:hidden">Back</span>
              </button>

              <div className="h-4 w-px bg-[var(--ps-card-border,#2C2C2E)] hidden sm:block" />

              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                  <Shield className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="font-extrabold text-xs sm:text-sm text-[var(--ps-text-main,#ffffff)] tracking-tight truncate">
                  Admin Portal
                </span>
                <span className="text-[11px] text-[var(--ps-text-muted,#9ca3af)] font-mono font-medium hidden lg:inline truncate">
                  ({adminName})
                </span>
              </div>
            </div>

            {/* Logout button on mobile / top bar */}
            {onLogoutAdmin && (
              <button
                onClick={onLogoutAdmin}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-300 border border-red-500/30 transition-colors cursor-pointer shadow-sm md:hidden shrink-0"
                title="Lock and sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Log Out</span>
              </button>
            )}
          </div>

          {/* Bottom Row / Right Side: Tabs Selector & Desktop Logout */}
          <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto overflow-x-auto scrollbar-none pb-1 md:pb-0">
            {/* Tabs Selector */}
            <div className="flex items-center bg-[var(--ps-card-bg,#1C1C1E)] p-1 rounded-xl border border-[var(--ps-card-border,#2C2C2E)] shadow-sm whitespace-nowrap min-w-fit">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-sm font-bold'
                    : 'text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)]'
                }`}
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
              </button>
              <button
                onClick={() => setActiveTab('theme')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'theme'
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-sm font-bold'
                    : 'text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Theme Studio</span>
              </button>
              <button
                onClick={() => setActiveTab('fleet')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'fleet'
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-sm font-bold'
                    : 'text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Manage Fleet ({cars.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-sm font-bold'
                    : 'text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Authors ({usersList.length || '3+'})</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-sm font-bold'
                    : 'text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>General Settings</span>
              </button>
            </div>

            {/* Desktop Logout button */}
            {onLogoutAdmin && (
              <button
                onClick={onLogoutAdmin}
                className="hidden md:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-300 border border-red-500/30 transition-colors cursor-pointer shadow-sm shrink-0"
                title="Lock and sign out of admin portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Lock / Log Out</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`mb-6 sm:mb-8 p-4 rounded-2xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
              statusMsg.type === 'success'
                ? 'bg-green-500/15 border-green-500/30 text-green-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {statusMsg.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <p className="text-sm font-medium">{statusMsg.text}</p>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: MULTI-IMAGE & FOLDER UPLOAD SUITE */}
        {activeTab === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Left Side: Upload & Multi-Photo Staging Tray (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-2xl sm:rounded-[24px] p-4 sm:p-6 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C2C2E] pb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Images className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                      Vehicle Gallery & Media Staging
                    </h2>
                    <p className="text-xs text-gray-400">
                      Upload individual photos, batch multi-select, or upload an entire folder of vehicle captures
                    </p>
                  </div>

                  {stagedPhotos.length > 0 && (
                    <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold px-3 py-1 rounded-full w-fit">
                      {stagedPhotos.length} {stagedPhotos.length === 1 ? 'Photo' : 'Photos'} Staged
                    </span>
                  )}
                </div>

                {/* Hidden Multi-file and Folder Inputs */}
                <input
                  ref={multiFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  // @ts-ignore
                  webkitdirectory=""
                  // @ts-ignore
                  directory=""
                  onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                  className="hidden"
                />

                {/* Upload Box / Dropzone */}
                {stagedPhotos.length === 0 ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-[#3C3C3E] hover:border-[var(--ps-primary,#0A84FF)] rounded-2xl p-6 sm:p-8 text-center transition-all bg-[#161618] relative group flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/10 text-[var(--ps-primary,#0A84FF)] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FolderUp className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-sm sm:text-base">
                        Drag & Drop Photos or Entire Car Folder Here
                      </h3>
                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                        Supports high-resolution JPG, PNG, WEBP, TIFF. Upload all angles (front, rear, interior, track action) at once.
                      </p>
                    </div>

                    {/* Dual Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => multiFileInputRef.current?.click()}
                        className="w-full sm:w-auto bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Images className="w-4 h-4" />
                        Select Multiple Photos
                      </button>

                      <button
                        type="button"
                        onClick={() => folderInputRef.current?.click()}
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <FolderUp className="w-4 h-4" />
                        Upload Car Folder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Primary Cover Spotlight Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Cover Photo */}
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-[var(--ps-primary,#0A84FF)] bg-black flex items-center justify-center group shadow-xl">
                        <img
                          src={currentCoverPhoto?.url}
                          alt="Primary Cover"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 bg-[var(--ps-primary,#0A84FF)] text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <Star className="w-3 h-3 fill-white" />
                          Primary Cover Photo
                        </div>

                        {/* Interactive Edit Trigger */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveEditingPhotoIndex(coverIndex);
                              setIsCropModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
                          >
                            <Crop className="w-3.5 h-3.5" />
                            Crop & Orient
                          </button>
                        </div>
                      </div>

                      {/* Cartoon Vector Preview */}
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-pink-500/40 bg-white flex items-center justify-center shadow-lg group">
                        {isAutoGeneratingCartoon ? (
                          <div className="flex flex-col items-center gap-2 text-pink-600 p-4">
                            <RefreshCw className="w-8 h-8 animate-spin" />
                            <span className="text-xs font-bold text-gray-800">Auto-Generating 2D Cartoon...</span>
                            <span className="text-[10px] text-gray-500">Applying comic inking & cel-shading</span>
                          </div>
                        ) : cartoonImageUrl ? (
                          <>
                            <img
                              src={formatMediaUrl(cartoonImageUrl)}
                              alt="Cartoon Sticker"
                              className="w-full h-full object-contain p-3"
                            />
                            <div className="absolute top-2.5 left-2.5 bg-pink-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                              <Sparkles className="w-3 h-3" />
                              2D Cartoon Attached
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCartoonPhotoUrl(currentCoverPhoto?.url || stagedPhotos[0]?.url);
                                  setIsCartoonStudioOpen(true);
                                }}
                                className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Studio / Fine-Tune
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCartoonImageUrl(null);
                                  setHasCartoon(false);
                                }}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-2.5 py-2 rounded-xl shadow-lg cursor-pointer"
                                title="Remove cartoon sticker"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center mx-auto mb-2">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-gray-800">2D Cartoon Vector Sticker</p>
                            <p className="text-[11px] text-gray-500 mb-3">
                              Turn selected picture into a stylized 2D decal sticker
                            </p>
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleAutoGenerateCartoonFromPhoto(currentCoverPhoto?.url || stagedPhotos[0]?.url)}
                                className="bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Auto-Apply Cartoon
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCartoonPhotoUrl(currentCoverPhoto?.url || stagedPhotos[0]?.url);
                                  setIsCartoonStudioOpen(true);
                                }}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-gray-300 transition-colors cursor-pointer"
                              >
                                Studio
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Staged Photos Gallery Grid */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Staged Photos in Gallery ({stagedPhotos.length})
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => multiFileInputRef.current?.click()}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Add More Photos
                          </button>
                          <button
                            type="button"
                            onClick={() => folderInputRef.current?.click()}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FolderUp className="w-3 h-3" />
                            Add Folder
                          </button>
                        </div>
                      </div>

                      {/* Thumbnails grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                        {stagedPhotos.map((photo, idx) => {
                          const isCover = coverIndex === idx;
                          return (
                            <div
                              key={photo.id}
                              className={`relative aspect-[4/3] rounded-xl overflow-hidden border group bg-black transition-all ${
                                isCover
                                  ? 'border-[var(--ps-primary,#0A84FF)] ring-2 ring-[var(--ps-primary,#0A84FF)]/40 shadow-md'
                                  : 'border-[#2C2C2E] hover:border-white/40'
                              }`}
                            >
                              <img
                                src={photo.url}
                                alt={photo.name}
                                className="w-full h-full object-cover"
                              />

                              {/* Index & Cover Badge */}
                              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                                <span className="bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-white font-bold">
                                  #{idx + 1}
                                </span>
                                {isCover && (
                                  <span className="bg-[var(--ps-primary,#0A84FF)] px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                                    Cover
                                  </span>
                                )}
                              </div>

                              {/* Action controls */}
                              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(photo.id, idx)}
                                    className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                                    title="Remove from batch"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAutoGenerateCartoonFromPhoto(photo.url)}
                                    className="w-full py-1 text-[10px] font-bold rounded bg-pink-600/90 hover:bg-pink-600 text-white flex items-center justify-center gap-1 transition-colors shadow-sm"
                                    title="Make Cartoon from this picture"
                                  >
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Make Cartoon
                                  </button>

                                  <div className="grid grid-cols-2 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setCoverIndex(idx)}
                                      className={`py-1 text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-colors ${
                                        isCover
                                          ? 'bg-[var(--ps-primary,#0A84FF)] text-white'
                                          : 'bg-white/20 hover:bg-white/30 text-white'
                                      }`}
                                    >
                                      <Star className="w-2.5 h-2.5" />
                                      {isCover ? 'Cover' : 'Cover'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveEditingPhotoIndex(idx);
                                        setIsCropModalOpen(true);
                                      }}
                                      className="py-1 text-[9px] font-bold rounded bg-blue-600/80 hover:bg-blue-600 text-white flex items-center justify-center gap-0.5 transition-colors"
                                    >
                                      <Crop className="w-2.5 h-2.5" />
                                      Crop
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Metadata, Vehicle Descriptor & Backend Publishing (5 cols) */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleSubmitCar}
                className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-2xl sm:rounded-[24px] p-4 sm:p-6 shadow-xl space-y-5"
              >
                <div className="border-b border-[#2C2C2E] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Tag className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                      Vehicle Identification & Specifications
                    </h2>
                    <p className="text-xs text-gray-400">
                      Configure vehicle name and specifications. Origin state refines regional search.
                    </p>
                  </div>
                </div>

                {/* State Origin Selector & Model Spec Input */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Origin State / Province Selector */}
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>Origin State / Region</span>
                      </label>
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#3A3A3C] focus:border-blue-400 rounded-xl py-3 px-3 text-white text-sm outline-none transition-all cursor-pointer font-medium"
                      >
                        {US_STATES.map((s) => (
                          <option key={s.code} value={s.code} className="bg-[#1C1C1E] text-white">
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Internal Model Tag / VIN Input - Optional with Auto-Fill */}
                    <div className="sm:col-span-7">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1">
                          <span>Model Code / VIN</span>
                          <span className="text-[10px] font-normal text-gray-400 lowercase">(optional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAutoFillPlate()}
                          disabled={isLookingUpPlate || !plateNumber.trim()}
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isLookingUpPlate ? (
                            <>
                              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              <span>Looking up...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>Auto-Fill</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. GT3-992, M4-COMP, or leave blank"
                          value={plateNumber}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setPlateNumber(val);
                          }}
                          onBlur={() => {
                            if (plateNumber.trim().length >= 3 && !model) {
                              handleAutoFillPlate(plateNumber);
                            }
                          }}
                          className="w-full bg-[#1C1C1E] border border-[#3A3A3C] focus:border-blue-400 rounded-xl py-2.5 pl-3.5 pr-14 text-white font-mono font-bold text-base tracking-wider uppercase outline-none shadow-inner transition-all placeholder:text-gray-600"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-white/10 text-gray-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                          OPTIONAL
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-fill indicator badge */}
                  {lookupFeedback && (
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>
                        <strong>Auto-Filled ({lookupFeedback.source}):</strong> {lookupFeedback.details}
                      </span>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-500">
                    💡 Shoot location may differ from vehicle origin. The state selector helps identify out-of-state cars accurately.
                  </p>
                </div>

                {/* Make & Model Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Porsche, BMW, Mazda"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Model / Trim
                    </label>
                    <input
                      type="text"
                      placeholder="911 GT3 RS, M4, C8"
                      value={model}
                      onChange={(e) => {
                        setModel(e.target.value);
                        if (!carName) setCarName(`${make} ${e.target.value}`);
                      }}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Car Display Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Car Title (Full Display Name)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2024 Porsche 911 GT3 RS (992)"
                    value={carName}
                    onChange={(e) => setCarName(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* Year & Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Model Year
                    </label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Color / Livery
                    </label>
                    <input
                      type="text"
                      placeholder="Python Green, Alpine White"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Event & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Event / Meet
                    </label>
                    <input
                      type="text"
                      placeholder="Laguna Seca Track Day"
                      value={event}
                      onChange={(e) => setEvent(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="Monterey, CA"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Automatic Photographer & Tipping Attribution Info */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={currentPhotographer.avatar}
                      alt={currentPhotographer.name}
                      className="w-9 h-9 rounded-full object-cover border border-white/15 shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {currentPhotographer.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded font-bold">
                          {adminUser?.role === 'admin' ? 'Lead Admin' : 'Photographer'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>
                          Photos & tips automatically attributed to your profile
                          {currentPhotographer.venmoHandle ? ` (@${currentPhotographer.venmoHandle})` : ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  {adminUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('users')}
                      className="text-[11px] font-medium text-[var(--ps-primary,#0A84FF)] hover:underline shrink-0 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      Manage Team
                    </button>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="TrackDay, Supercar, HighRes, Aero"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-3 border-t border-[#2C2C2E]">
                  <button
                    type="submit"
                    disabled={isSubmitting || stagedPhotos.length === 0}
                    className="w-full bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Publishing {stagedPhotos.length} Photos...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>
                          Publish Vehicle Gallery ({stagedPhotos.length} {stagedPhotos.length === 1 ? 'Photo' : 'Photos'})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: THEME STUDIO */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            <div className="lg:col-span-12 bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-2xl sm:rounded-[24px] p-4 sm:p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2C2E] pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                    Global Website Theme & Color Studio
                  </h2>
                  <p className="text-xs text-gray-400">
                    Customize every color, accent, and contrast token in real-time across visitor & admin views
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {themeSavedToast && (
                    <span className="text-xs font-bold text-green-400 animate-in fade-in flex items-center gap-1">
                      <Check className="w-4 h-4" /> Saved Globally!
                    </span>
                  )}
                  <button
                    onClick={handleSaveThemeGlobal}
                    className="bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Save Theme Changes
                  </button>
                </div>
              </div>

              {/* Theme Presets */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 block">
                  Quick Theme Presets:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                  {DEFAULT_THEMES.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                        themeForm.id === preset.id
                          ? 'border-[var(--ps-primary,#0A84FF)] ring-2 ring-[var(--ps-primary,#0A84FF)]/40 bg-white/5'
                          : 'border-[#2C2C2E] hover:border-white/30 bg-[#161618]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: preset.bg }} />
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: preset.cardBg }} />
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: preset.primary }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Customizers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t border-[#2C2C2E]">
                {/* Primary Accent */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Primary Brand Accent</span>
                    <span className="font-mono text-xs text-gray-400">{themeForm.primary}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={themeForm.primary}
                      onChange={(e) => handleThemeColorChange('primary', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-[#3C3C3E] cursor-pointer shrink-0"
                    />
                    <div className="flex-1 flex gap-1.5 flex-wrap">
                      {['#0A84FF', '#FF2A54', '#00F5D4', '#FFB703', '#A855F7', '#10B981'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleThemeColorChange('primary', c)}
                          className="w-6 h-6 rounded-lg border border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* App Canvas Background */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Canvas Background</span>
                    <span className="font-mono text-xs text-gray-400">{themeForm.bg}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={themeForm.bg.startsWith('#') ? themeForm.bg : '#000000'}
                      onChange={(e) => handleThemeColorChange('bg', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-[#3C3C3E] cursor-pointer shrink-0"
                    />
                    <div className="flex-1 flex gap-1.5 flex-wrap">
                      {['#000000', '#08080C', '#0A0A0A', '#121212', '#FAFAFA', '#F3F4F6'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleThemeColorChange('bg', c)}
                          className="w-6 h-6 rounded-lg border border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Container Background */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Card Container Background</span>
                    <span className="font-mono text-xs text-gray-400">{themeForm.cardBg}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={themeForm.cardBg.startsWith('#') ? themeForm.cardBg : '#111111'}
                      onChange={(e) => handleThemeColorChange('cardBg', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-[#3C3C3E] cursor-pointer shrink-0"
                    />
                    <div className="flex-1 flex gap-1.5 flex-wrap">
                      {['#111111', '#16161A', '#141414', '#1A1A1E', '#FFFFFF', '#F9FAFB'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleThemeColorChange('cardBg', c)}
                          className="w-6 h-6 rounded-lg border border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FLEET & GALLERY MANAGEMENT */}
        {activeTab === 'fleet' && (
          <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-2xl sm:rounded-[24px] p-4 sm:p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2C2E] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                  Live Gallery Fleet Management ({cars.length} vehicles)
                </h2>
                <p className="text-xs text-gray-400">
                  Review vehicle records, manage multi-photo collections, and add new captures to existing cars
                </p>
              </div>

              <button
                onClick={() => setActiveTab('upload')}
                className="bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Upload New Car / Folder
              </button>
            </div>

            {/* Grid of uploaded cars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {cars.map((car) => {
                const photoCount = (Array.isArray(car.images) && car.images.length) || car.photoCount || 1;
                return (
                  <div
                    key={car.id}
                    className="bg-[#161618] border border-[#2C2C2E] rounded-2xl overflow-hidden shadow-lg p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div
                        onClick={() => handleSelectCarForEdit(car)}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-pointer group"
                        title="Click to manage vehicle and photos"
                      >
                        <img
                          src={formatMediaUrl(car.imageUrl)}
                          alt={car.carName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                          <Edit3 className="w-4 h-4 text-[var(--ps-primary,#0A84FF)]" />
                          <span>Manage Vehicle</span>
                        </div>
                        <div className="absolute top-2.5 left-2.5 bg-black/80 px-2.5 py-0.5 rounded-full border border-white/20 text-xs font-mono font-bold text-white flex items-center gap-1.5 shadow-md">
                          <span className="truncate max-w-[150px] text-white">{car.carName || `${car.make} ${car.model}`}</span>
                        </div>
                        <div className="absolute top-2.5 right-2.5 bg-black/80 px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-mono font-bold text-white flex items-center gap-1.5 shadow-md">
                          <Images className="w-3 h-3 text-sky-400" />
                          <span className="text-white font-bold">{photoCount} {photoCount === 1 ? 'Shot' : 'Shots'}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white truncate">{car.carName}</h4>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">{car.event}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 font-mono">
                          <span>👁️ {car.views || 0} views</span>
                          <span>⬇️ {car.downloads || 0} downloads</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#2C2C2E] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSelectCarForEdit(car)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[var(--ps-primary,#0A84FF)]" />
                        <span>Edit Details & Photos ({photoCount})</span>
                      </button>

                      <button
                        onClick={() => onDeleteCar(car.id)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete vehicle record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: PHOTOGRAPHER & USER MANAGEMENT */}
        {activeTab === 'users' && (
          <UserManagementSection
            currentUser={adminUser}
            adminToken={adminToken}
            onUserListChanged={fetchUsers}
          />
        )}

        {/* TAB 5: GENERAL & AI SETTINGS */}
        {activeTab === 'settings' && (
          <GeneralSettingsSection
            initialSettings={localGeneralSettings || generalSettings}
            onSaveSettings={async (savedSettings) => {
              setLocalGeneralSettings(savedSettings);
              if (onSaveSettings) {
                return await onSaveSettings(savedSettings);
              } else {
                try {
                  const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: savedSettings }),
                  });
                  return res.ok;
                } catch {
                  return false;
                }
              }
            }}
            adminToken={adminToken}
          />
        )}
      </main>

      {/* Editing Car Gallery & Details Modal */}
      {editingCarGallery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-[#161618] border border-[#2C2C2E] rounded-2xl sm:rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-5 sm:space-y-6 max-h-[94vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-3 sm:pb-4 gap-2">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                  <Edit3 className="w-5 h-5 text-[var(--ps-primary,#0A84FF)] shrink-0" />
                  <span className="truncate">Update Vehicle Details</span>
                </h3>
                <p className="text-xs text-gray-400 truncate">
                  {editingCarGallery.carName || `${editingCarGallery.make || ''} ${editingCarGallery.model || ''}`.trim() || 'Vehicle Details'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveCarDetails}
                  disabled={isSavingEdit}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Save Changes</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setEditingCarGallery(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-[#2C2C2E] gap-2 pb-1 overflow-x-auto scrollbar-none whitespace-nowrap">
              <button
                type="button"
                onClick={() => setEditModalTab('info')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  editModalTab === 'info'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Tag className="w-4 h-4 text-blue-400" />
                <span>Vehicle & Specs</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab('photos')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  editModalTab === 'photos'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Images className="w-4 h-4 text-purple-400" />
                <span>Manage Photos ({editImages.length})</span>
              </button>
            </div>

            {/* Hidden Input for Adding to existing car */}
            <input
              ref={manageCarFileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleAddPhotosToExistingCar(e.target.files)}
              className="hidden"
            />

            {/* TAB: METADATA & SPECS */}
            {editModalTab === 'info' && (
              <div className="space-y-5">
                {/* Vehicle Identification */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                    Vehicle Specifications & Display
                  </span>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Car Title (Full Display Name)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2024 Porsche 911 GT3 RS"
                      value={editCarName}
                      onChange={(e) => setEditCarName(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Manufacturer
                      </label>
                      <input
                        type="text"
                        placeholder="Porsche, BMW, Mazda"
                        value={editMake}
                        onChange={(e) => setEditMake(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Model / Trim
                      </label>
                      <input
                        type="text"
                        placeholder="911 GT3 RS, M4, C8"
                        value={editModel}
                        onChange={(e) => setEditModel(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Model Year
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2024 (or blank)"
                        value={editYear}
                        onChange={(e) => setEditYear(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Color / Finish
                      </label>
                      <input
                        type="text"
                        placeholder="Python Green, Alpine White"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Origin State / Region
                      </label>
                      <select
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">None / Unspecified</option>
                        {US_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Model Tag / VIN
                      </label>
                      <input
                        type="text"
                        placeholder="Optional internal code"
                        value={editPlateNumber}
                        onChange={(e) => setEditPlateNumber(e.target.value.toUpperCase())}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white font-mono text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Event & Shoot Info */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                    Event, Location & Camera Rig
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Event / Meet Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sunset Track Day (or blank)"
                        value={editEvent}
                        onChange={(e) => setEditEvent(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Location / Venue
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Laguna Seca, CA (or blank)"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Shoot Date
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Oct 2024"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Camera & Lens Rig
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sony A7IV • 70-200mm"
                        value={editCameraInfo}
                        onChange={(e) => setEditCameraInfo(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Resolution & Output
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 6000x4000 • 300 DPI"
                        value={editResolution}
                        onChange={(e) => setEditResolution(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Search Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TrackDay, Supercar, RollingShot"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PHOTOS & GALLERY */}
            {editModalTab === 'photos' && (
              <div className="space-y-5">
                {/* Add Extra Photos Trigger */}
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div>
                    <p className="text-xs font-bold text-white">Add Extra Angles & Shots</p>
                    <p className="text-[11px] text-gray-400">Append high-res photos to this car's gallery</p>
                  </div>

                  <button
                    onClick={() => manageCarFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Upload More Photos
                  </button>
                </div>

                {/* Photos Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Photos in Gallery ({editImages.length})
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Click "Set Cover" on any shot to make it the primary thumbnail
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {editImages.map((imgUrl, idx) => {
                      const isCover = (editCoverImageUrl || editImages[0]) === imgUrl;
                      return (
                        <div
                          key={idx}
                          className={`relative aspect-[4/3] rounded-xl overflow-hidden border bg-black group transition-all ${
                            isCover ? 'border-[var(--ps-primary,#0A84FF)] ring-2 ring-blue-500/40' : 'border-[#2C2C2E]'
                          }`}
                        >
                          <img
                            src={formatMediaUrl(imgUrl)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1.5 left-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-white flex items-center gap-1">
                            <span>#{idx + 1}</span>
                            {isCover && (
                              <span className="bg-blue-600 text-white px-1 rounded text-[8px] font-bold uppercase">
                                Cover
                              </span>
                            )}
                          </div>

                          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                            <div className="flex justify-between items-center">
                              {!isCover ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetCoverPhoto(imgUrl)}
                                  className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-md cursor-pointer"
                                >
                                  Set Cover
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded">
                                  ★ Primary
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemovePhotoFromExistingCar(idx)}
                                className="p-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-transform hover:scale-110 cursor-pointer"
                                title="Delete photo from gallery"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAutoGenerateForExistingCar(editingCarGallery, imgUrl)}
                              className="w-full py-1.5 px-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              Make 2D Cartoon Sticker
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-[#2C2C2E] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setEditingCarGallery(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer text-center"
              >
                Cancel / Close
              </button>

              <button
                type="button"
                onClick={handleSaveCarDetails}
                disabled={isSavingEdit}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Updates...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save All Vehicle & Shot Updates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isCropModalOpen && stagedPhotos[activeEditingPhotoIndex] && (
        <ImageEditorModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageUrl={stagedPhotos[activeEditingPhotoIndex].url}
          onSave={(editedUrl) => {
            const updated = [...stagedPhotos];
            updated[activeEditingPhotoIndex] = {
              ...updated[activeEditingPhotoIndex],
              url: editedUrl,
            };
            setStagedPhotos(updated);
            setStatusMsg({ type: 'success', text: 'Cropped and oriented image saved in staged batch!' });
          }}
        />
      )}

      {isCartoonStudioOpen && (selectedCartoonPhotoUrl || currentCoverPhoto?.url || stagedPhotos[0]?.url) && (
        <CartoonArtStudio
          isOpen={isCartoonStudioOpen}
          onClose={() => setIsCartoonStudioOpen(false)}
          plateNumber={plateNumber || editingCarGallery?.plateNumber || ''}
          carName={carName || `${make} ${model}`}
          make={make}
          model={model}
          color={color}
          originalImageUrl={selectedCartoonPhotoUrl || currentCoverPhoto?.url || stagedPhotos[0]?.url}
          availableImages={stagedPhotos.map((p) => p.url)}
          onApplyCartoon={(cartoonUrl) => {
            setCartoonImageUrl(cartoonUrl);
            setHasCartoon(true);
            setStatusMsg({
              type: 'success',
              text: '✨ 2D Cartoon Art vector sticker successfully attached to car gallery!',
            });
          }}
        />
      )}
    </div>
  );
};
export default AdminPortal;
