import {
  BookOpen, Highlighter, PenTool, Bookmark,
  PencilLine, Crop, FileImage, Type, Hash, Droplet,
  ImagePlus, Image, FileType, FileSpreadsheet, Scan,
  FilePlus2, Scissors, Layers, FileEdit,
  Lock, FileDown, Eraser, FileCog, Printer, ListChecks, GitCompare,
  RefreshCw, ShieldCheck, Search, Star, Clock, Settings,
  Home, ChevronDown, ChevronRight, ArrowRight, X, FileText, Sparkles,
} from 'lucide-react'

const iconRegistry = {
  BookOpen, Highlighter, PenTool, Bookmark,
  PencilLine, Crop, FileImage, Type, Hash, Droplet,
  ImagePlus, Image, FileType, FileSpreadsheet, Scan,
  FilePlus2, Scissors, Layers, FileEdit,
  Lock, FileDown, Eraser, FileCog, Printer, ListChecks, GitCompare,
  RefreshCw, ShieldCheck, Search, Star, Clock, Settings,
  Home, ChevronDown, ChevronRight, ArrowRight, X, FileText, Sparkles,
}

export function getIcon(name) {
  return iconRegistry[name] || BookOpen
}

export default iconRegistry
