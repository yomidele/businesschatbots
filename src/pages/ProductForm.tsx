import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ProductForm = ({ onSuccess, onCancel }: ProductFormProps) => {
  const { siteId } = useParams<{ siteId: string }>();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "general",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      formDataObj.append("site_id", siteId!);

      const response = await fetch("/functions/v1/upload-product-image", {
        method: "POST",
        body: formDataObj,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImageUrl(data.image_url);
      toast({ title: "Image uploaded successfully!" });
    },
    onError: (error) => {
      toast({
        title: "Image upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setSelectedFile(null);
      setImagePreview(null);
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async () => {
      if (!imageUrl) {
        throw new Error("Please upload a product image");
      }

      const { data, error } = await supabase.from("products").insert({
        site_id: siteId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: imageUrl,
        category: formData.category,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Product created successfully!" });
      setFormData({ name: "", description: "", price: "", category: "general" });
      setSelectedFile(null);
      setImagePreview(null);
      setImageUrl(null);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to create product",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Images must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
    // Automatically upload
    uploadImageMutation.mutate(file);
  };

  const handleDragDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = document.createElement("input");
      input.type = "file";
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleFileSelect({ target: input } as any);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Validation error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast({
        title: "Validation error",
        description: "Price must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!imageUrl) {
      toast({
        title: "Validation error",
        description: "Please upload a product image",
        variant: "destructive",
      });
      return;
    }

    createProductMutation.mutate();
  };

  const isLoading = uploadImageMutation.isPending || createProductMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Product</CardTitle>
        <CardDescription>Create a new product with image for your store</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Premium Laptop Stand"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isLoading}
              required
            />
          </div>

          {/* Product Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your product..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₦) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="10000"
                step="100"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="general">General</option>
                <option value="digital">Digital</option>
                <option value="physical">Physical</option>
                <option value="service">Service</option>
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Product Image *</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDragDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${{
                "border-muted-foreground": !uploadImageMutation.isPending,
                "border-blue-500 bg-blue-50": uploadImageMutation.isPending,
              }}`}
            >
              <input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="hidden"
              />
              <label htmlFor="image" className="cursor-pointer block">
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 mx-auto object-cover rounded"
                    />
                    {uploadImageMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : imageUrl ? (
                      <p className="text-sm text-green-600">✓ Image uploaded</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="font-medium">Drag and drop your image</p>
                      <p className="text-sm text-muted-foreground">
                        or click to select (max 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
            {imagePreview && imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setImagePreview(null);
                  setImageUrl(null);
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Remove Image
              </Button>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !imageUrl}
              className="flex-1"
            >
              {createProductMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductForm;
