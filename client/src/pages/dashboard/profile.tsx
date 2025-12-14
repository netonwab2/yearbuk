import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { User, Award, Plus, Trash2, Settings, GraduationCap, ShoppingCart } from "lucide-react";
import type { AlumniBadge, User as UserType, School } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BADGE_SLOT_PRICE } from "@shared/constants";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<UserType | null>(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editingPhoneNumber, setEditingPhoneNumber] = useState("");
  const [showBuySlotsDialog, setShowBuySlotsDialog] = useState(false);
  const [slotsToBuy, setSlotsToBuy] = useState(1);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const { toast } = useToast();
  const { convertPrice, formatPrice } = useCurrency();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      fetch(`/api/users/${parsedUser.id}`)
        .then(res => res.json())
        .then(updatedUser => {
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        })
        .catch(err => console.error('Failed to refresh user data:', err));
    }
  }, []);

  const { data: alumniBadges = [] } = useQuery<AlumniBadge[]>({
    queryKey: ["/api/alumni-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/alumni-badges/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch alumni badges");
      return res.json();
    }
  });

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    enabled: !!user,
  });

  const getSchoolLogo = (schoolName: string): string | null => {
    const school = schools.find(s => s.name === schoolName);
    return school?.logo || null;
  };

  const maxAlumniBadges = user?.badgeSlots || 4;
  const accountStatus = alumniBadges.length > 0 ? "Alumni" : "Viewer";

  const handlePhoneNumberUpdate = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: editingPhoneNumber }),
      });
      
      if (response.ok) {
        const updatedUser = { ...user, phoneNumber: editingPhoneNumber };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setIsEditingPhone(false);
        toast({
          title: "Phone number updated",
          description: "Your phone number has been successfully updated.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update phone number. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePhonePrivacyToggle = async (checked: boolean) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showPhoneToAlumni: checked }),
      });
      
      if (response.ok) {
        const updatedUser = { ...user, showPhoneToAlumni: checked };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast({
          title: "Privacy setting updated",
          description: checked ? "Your phone number will be visible to alumni" : "Your phone number will be hidden from alumni",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update privacy setting. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteAlumniBadgeMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      await apiRequest("DELETE", `/api/alumni-badges/${badgeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alumni-badges", user?.id] });
      toast({
        title: "Badge deleted",
        description: "Alumni badge has been successfully deleted.",
      });
    },
  });

  const handleDeleteAlumniBadge = (badgeId: string) => {
    deleteAlumniBadgeMutation.mutate(badgeId);
  };

  const addBadgeSlotsToCartMutation = useMutation({
    mutationFn: async (numberOfSlots: number) => {
      const totalPrice = (BADGE_SLOT_PRICE * numberOfSlots).toFixed(2);
      await apiRequest("POST", "/api/cart", {
        userId: user?.id,
        itemType: "badge_slot",
        quantity: numberOfSlots,
        price: totalPrice,
        schoolId: null,
        year: null,
        orientation: null,
        uploadType: null
      });
    },
    onSuccess: () => {
      setShowBuySlotsDialog(false);
      setSlotsToBuy(1);
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
      toast({
        className: "bg-green-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
        title: "Added to cart! 🛒",
        description: `${slotsToBuy} badge slot(s) added to your cart. Go to cart to checkout.`,
      });
    },
  });

  if (!user) return null;

  return (
    <div className="space-y-8">
      <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">My Profile</h2>
              <p className="text-blue-200">Manage your account information</p>
            </div>
            <User className="h-12 w-12 text-green-400" />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-white">Full Name</Label>
                <Input
                  value={user.fullName || ''}
                  disabled
                  className="mt-2 bg-white/10 border-white/20 text-white"
                  data-testid="input-full-name"
                />
              </div>

              <div>
                <Label className="text-white">Email</Label>
                <Input
                  value={user.email}
                  disabled
                  className="mt-2 bg-white/10 border-white/20 text-white"
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label className="text-white">Username</Label>
                <Input
                  value={user.username}
                  disabled
                  className="mt-2 bg-white/10 border-white/20 text-white"
                  data-testid="input-username"
                />
              </div>

              <div>
                <Label className="text-white">Phone Number</Label>
                <div className="flex gap-2 mt-2">
                  {isEditingPhone ? (
                    <>
                      <Input
                        value={editingPhoneNumber}
                        onChange={(e) => setEditingPhoneNumber(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                        data-testid="input-phone-edit"
                      />
                      <Button
                        onClick={handlePhoneNumberUpdate}
                        className="bg-green-500/20 border border-green-400 text-white"
                        data-testid="button-save-phone"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setIsEditingPhone(false)}
                        variant="outline"
                        className="bg-red-500/20 border border-red-400 text-white"
                        data-testid="button-cancel-phone"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        value={user.phoneNumber || 'Not set'}
                        disabled
                        className="bg-white/10 border-white/20 text-white"
                        data-testid="input-phone"
                      />
                      <Button
                        onClick={() => {
                          setEditingPhoneNumber(user.phoneNumber || "");
                          setIsEditingPhone(true);
                        }}
                        className="bg-blue-500/20 border border-blue-400 text-white"
                        data-testid="button-edit-phone"
                      >
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <Label className="text-white">Show phone number to alumni</Label>
                <p className="text-sm text-blue-200 mt-1">Allow verified alumni to see your contact information</p>
              </div>
              <Switch
                checked={user.showPhoneToAlumni || false}
                onCheckedChange={handlePhonePrivacyToggle}
                data-testid="switch-phone-privacy"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setLocation("/viewer-settings")}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                data-testid="button-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Alumni Badges</h3>
              <p className="text-blue-200">
                {alumniBadges.length} / {maxAlumniBadges} slots used
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation("/request-alumni-status")}
                disabled={alumniBadges.length >= maxAlumniBadges}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                data-testid="button-request-alumni"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request Alumni Status
              </Button>
              <Button
                onClick={() => setShowBuySlotsDialog(true)}
                variant="outline"
                className="bg-yellow-500/20 border border-yellow-400 text-white"
                data-testid="button-buy-slots"
              >
                <Plus className="h-4 w-4 mr-2" />
                Buy More Slots
              </Button>
            </div>
          </div>

          {/* Alumni Badges Grid - Show only first 4 */}
          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
            {/* Existing badges - limited to 4 */}
            {alumniBadges.slice(0, 4).map((badge) => (
              <Card key={badge.id} className={`border-2 ${
                badge.status === "verified" 
                  ? "bg-green-500/30 backdrop-blur-lg border border-white/20 shadow-2xl border-green-500" 
                  : "bg-orange-500/30 backdrop-blur-lg border border-white/20 shadow-2xl border-orange-500"
              }`} data-testid={`card-badge-${badge.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getSchoolLogo(badge.school) ? (
                          <img 
                            src={`/public${getSchoolLogo(badge.school)}`} 
                            alt={badge.school}
                            className="h-6 w-6 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <GraduationCap className={`h-4 w-4 ${
                            badge.status === "verified" ? "text-green-600" : "text-orange-600"
                          }`} />
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          badge.status === "verified"
                            ? "bg-green-100 text-green-800" 
                            : "bg-orange-100 text-orange-800"
                        }`}>
                          {badge.status === "verified" ? "Approved" : "Pending"}
                        </span>
                      </div>
                      <h4 className="font-semibold text-white text-sm" data-testid={`text-badge-school-${badge.id}`}>{badge.school}</h4>
                      <p className="text-sm text-gray-50">Class of {badge.graduationYear}</p>
                      <p className="text-xs text-gray-50">Admitted: {badge.admissionYear}</p>
                    </div>
                    <div className="ml-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                            data-testid={`button-delete-badge-${badge.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Alumni Badge?</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2 text-white">
                              <p>Are you sure you want to delete this alumni badge for <strong>{badge.school}</strong>?</p>
                              <div className="bg-amber-500/30 backdrop-blur-lg border border-white/20 shadow-2xl rounded p-3 text-sm">
                                <p className="font-medium text-amber-50 mb-1">⚠️ Important Warning:</p>
                                <ul className="text-amber-50 space-y-1">
                                  <li>• This action is <strong>irreversible</strong></li>
                                  <li>• You will lose your verified/pending status for this school</li>
                                </ul>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAlumniBadge(badge.id)}
                              className="bg-red-600/80 backdrop-blur-lg border border-white/20 shadow-2xl hover:bg-red-600"
                              data-testid={`button-confirm-delete-${badge.id}`}
                            >
                              Delete Badge
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Empty slots - show remaining up to 4 total */}
            {alumniBadges.length < 4 && Array.from({ length: Math.min(4 - alumniBadges.length, maxAlumniBadges - alumniBadges.length) }).map((_, index) => (
              <Card key={`empty-${index}`} className="border-2 border-dashed border-white/30 bg-white/5 backdrop-blur-lg" data-testid={`card-empty-slot-${index}`}>
                <CardContent className="p-4 flex items-center justify-center h-24">
                  <div className="text-center text-white/40">
                    <Plus className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Empty Slot</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* See More Badges Dialog - Show when total slots > 4 */}
          {maxAlumniBadges > 4 && (
            <div className="text-center mb-4">
              <Dialog open={showAllBadges} onOpenChange={setShowAllBadges}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40"
                    data-testid="button-see-all-badges"
                  >
                    <Award className="h-4 w-4 mr-2" />
                    See All {maxAlumniBadges} Slots
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl text-white max-w-4xl max-h-[80vh] overflow-y-auto">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">All Alumni Badge Slots ({alumniBadges.length}/{maxAlumniBadges})</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Show all existing badges */}
                      {alumniBadges.map((badge) => (
                        <Card key={badge.id} className={`border-2 ${
                          badge.status === "verified" 
                            ? "bg-green-500/30 backdrop-blur-lg border border-white/20 shadow-2xl border-green-500" 
                            : "bg-orange-500/30 backdrop-blur-lg border border-white/20 shadow-2xl border-orange-500"
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  {getSchoolLogo(badge.school) ? (
                                    <img 
                                      src={`/public${getSchoolLogo(badge.school)}`} 
                                      alt={badge.school}
                                      className="h-6 w-6 rounded-full object-cover border border-white/20"
                                    />
                                  ) : (
                                    <GraduationCap className={`h-4 w-4 ${
                                      badge.status === "verified" ? "text-green-600" : "text-orange-600"
                                    }`} />
                                  )}
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    badge.status === "verified"
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-orange-100 text-orange-800"
                                  }`}>
                                    {badge.status === "verified" ? "Approved" : "Pending"}
                                  </span>
                                </div>
                                <h4 className="font-semibold text-white text-sm">{badge.school}</h4>
                                <p className="text-sm text-gray-50">Class of {badge.graduationYear}</p>
                                <p className="text-xs text-gray-50">Admitted: {badge.admissionYear}</p>
                              </div>
                              <div className="ml-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl text-white">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Alumni Badge?</AlertDialogTitle>
                                      <AlertDialogDescription className="space-y-2 text-white">
                                        <p>Are you sure you want to delete this alumni badge for <strong>{badge.school}</strong>?</p>
                                        <div className="bg-amber-500/30 backdrop-blur-lg border border-white/20 shadow-2xl rounded p-3 text-sm">
                                          <p className="font-medium text-amber-50 mb-1">⚠️ Important Warning:</p>
                                          <ul className="text-amber-50 space-y-1">
                                            <li>• This action is <strong>irreversible</strong></li>
                                            <li>• You will lose your verified/pending status for this school</li>
                                            <li>• You will not be able to send a request to this school for the next 30 days</li>
                                          </ul>
                                        </div>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          handleDeleteAlumniBadge(badge.id);
                                          if (maxAlumniBadges <= 4) {
                                            setShowAllBadges(false);
                                          }
                                        }}
                                        className="bg-red-600/80 backdrop-blur-lg border border-white/20 shadow-2xl hover:bg-red-600"
                                      >
                                        Delete Badge
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Show all empty slots */}
                      {Array.from({ length: maxAlumniBadges - alumniBadges.length }).map((_, index) => (
                        <Card key={`empty-dialog-${index}`} className="border-2 border-dashed border-white/30 bg-white/5 backdrop-blur-lg">
                          <CardContent className="p-4 flex items-center justify-center h-24">
                            <div className="text-center text-white/40">
                              <Plus className="h-6 w-6 mx-auto mb-1" />
                              <p className="text-xs">Empty Slot</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Buy Badge Slots Dialog */}
      <Dialog open={showBuySlotsDialog} onOpenChange={setShowBuySlotsDialog}>
        <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl text-white">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Purchase Additional Badge Slots</h3>
              <p className="text-white/70 text-sm">
                Currently you have <strong>{maxAlumniBadges}</strong> badge slots. Purchase additional slots to add more alumni badges.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slots" className="text-white">Number of slots to purchase</Label>
                <Input
                  id="slots"
                  type="number"
                  min="1"
                  max="20"
                  value={slotsToBuy}
                  onChange={(e) => setSlotsToBuy(parseInt(e.target.value) || 1)}
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-slots-to-buy"
                />
              </div>

              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Price per slot:</span>
                  <span className="text-white font-medium">{formatPrice(convertPrice(BADGE_SLOT_PRICE))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Number of slots:</span>
                  <span className="text-white font-medium">{slotsToBuy}</span>
                </div>
                <div className="h-px bg-white/20 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Total:</span>
                  <span className="text-white font-semibold text-lg">{formatPrice(convertPrice(BADGE_SLOT_PRICE * slotsToBuy))}</span>
                </div>
              </div>

              <div className="bg-blue-900/20 rounded-lg p-3 text-sm text-blue-300">
                <p className="font-medium mb-1">ℹ️ Note:</p>
                <p>Add badge slots to your cart, then checkout to complete your purchase.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBuySlotsDialog(false);
                  setSlotsToBuy(1);
                }}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="button-cancel-purchase"
              >
                Cancel
              </Button>
              <Button
                onClick={() => addBadgeSlotsToCartMutation.mutate(slotsToBuy)}
                disabled={addBadgeSlotsToCartMutation.isPending || slotsToBuy < 1}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {addBadgeSlotsToCartMutation.isPending ? "Adding..." : `Add ${slotsToBuy} Slot${slotsToBuy > 1 ? 's' : ''} to Cart`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
