import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addToCartApi,
  clearCartApi,
  getCartApi,
  removeCartItemApi,
  updateCartQuantityApi,
  updateCartVariantApi,
} from "../services/cartService";

const CartContext = createContext(null);

const GUEST_CART_KEY = "guest_cart_items";

function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("readGuestCart error:", error);
    return [];
  }
}

function writeGuestCart(items) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items || []));
  } catch (error) {
    console.error("writeGuestCart error:", error);
  }
}

function removeCheckedGuestCartItems(itemsToRemove = []) {
  const current = readGuestCart();
  const nextItems = current.filter((cartItem) => {
    const matched = itemsToRemove.some(
      (item) =>
        String(item.productId || "") === String(cartItem.productId || "") &&
        String(item.variantId || "") === String(cartItem.variantId || ""),
    );
    return !matched;
  });
  writeGuestCart(nextItems);
  return nextItems;
}

function normalizeCartItems(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);

  const getStoredUser = useCallback(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("Lỗi parse user localStorage:", error);
      return null;
    }
  }, []);

  const getUserId = useCallback(() => {
    const user = getStoredUser();
    const id = user?._id || user?.id || null;
    return typeof id === "string" && id.trim() ? id : null;
  }, [getStoredUser]);

  const fetchCart = useCallback(async () => {
    try {
      const userId = getUserId();

      if (!userId) {
        const guestItems = readGuestCart();
        setCartItems(guestItems);
        return { success: true, guest: true, items: guestItems };
      }

      setCartLoading(true);
      const res = await getCartApi(userId);
      const items = normalizeCartItems(res);
      setCartItems(items);
      return { success: true, data: res };
    } catch (error) {
      console.error("fetchCart error:", error);
      const userId = getUserId();

      if (!userId) {
        const guestItems = readGuestCart();
        setCartItems(guestItems);
        return { success: true, guest: true, items: guestItems };
      }

      setCartItems([]);
      return {
        success: false,
        error,
        message: error?.response?.data?.message || "Không thể tải giỏ hàng",
      };
    } finally {
      setCartLoading(false);
    }
  }, [getUserId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToGuestCart = useCallback(
    ({ productId, variantId, quantity = 1 }) => {
      const qty = Math.max(1, Number(quantity || 1));
      const current = readGuestCart();

      const found = current.find(
        (item) =>
          String(item.productId) === String(productId) &&
          String(item.variantId) === String(variantId),
      );

      let nextItems;
      if (found) {
        nextItems = current.map((item) =>
          String(item.productId) === String(productId) &&
          String(item.variantId) === String(variantId)
            ? { ...item, quantity: Number(item.quantity || 0) + qty }
            : item,
        );
      } else {
        nextItems = [
          ...current,
          {
            _id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            productId,
            variantId,
            quantity: qty,
            selected: true,
            isGuest: true,
          },
        ];
      }

      writeGuestCart(nextItems);
      setCartItems(nextItems);

      return {
        success: true,
        guest: true,
        items: nextItems,
        message: "Đã thêm sản phẩm vào giỏ hàng",
      };
    },
    [],
  );

  const addToCart = useCallback(
    async ({ productId, variantId, quantity = 1 }) => {
      try {
        const userId = getUserId();
        if (!productId) return { success: false, message: "Thiếu productId" };
        if (variantId === undefined)
          return { success: false, message: "Thiếu variantId" };

        if (!userId) {
          return addToGuestCart({ productId, variantId, quantity });
        }

        const qty = Math.max(1, Number(quantity || 1));
        const res = await addToCartApi({
          userId,
          productId,
          variantId,
          quantity: qty,
        });
        setCartItems(normalizeCartItems(res));

        return {
          success: true,
          data: res,
          message: "Đã thêm sản phẩm vào giỏ hàng",
        };
      } catch (error) {
        return {
          success: false,
          message: error?.response?.data?.message || "Không thể thêm sản phẩm",
        };
      }
    },
    [addToGuestCart, getUserId],
  );

  const removeFromCart = useCallback(
    async ({ itemId, productId, variantId }) => {
      try {
        const userId = getUserId();

        if (!userId) {
          const current = readGuestCart();
          const nextItems = current.filter((item) => {
            if (itemId) return String(item._id) !== String(itemId);
            return !(
              String(item.productId) === String(productId) &&
              String(item.variantId) === String(variantId)
            );
          });
          writeGuestCart(nextItems);
          setCartItems(nextItems);
          return { success: true, guest: true, items: nextItems };
        }

        const res = await removeCartItemApi({
          userId,
          itemId,
          productId,
          variantId,
        });
        setCartItems(normalizeCartItems(res));
        return { success: true, data: res };
      } catch (error) {
        return { success: false, message: "Không thể xóa sản phẩm" };
      }
    },
    [getUserId],
  );

  const setQuantity = useCallback(
    async ({ itemId, productId, variantId, quantity }) => {
      try {
        const userId = getUserId();
        const qty = Math.max(1, Number(quantity || 1));

        if (!userId) {
          const current = readGuestCart();
          const nextItems = current.map((item) => {
            const matchById = itemId && String(item._id) === String(itemId);
            const matchByPair =
              String(item.productId) === String(productId) &&
              String(item.variantId) === String(variantId);

            return matchById || matchByPair ? { ...item, quantity: qty } : item;
          });
          writeGuestCart(nextItems);
          setCartItems(nextItems);
          return { success: true, guest: true, items: nextItems };
        }

        const res = await updateCartQuantityApi({
          userId,
          itemId,
          productId,
          variantId,
          quantity: qty,
        });
        setCartItems(normalizeCartItems(res));
        return { success: true, data: res };
      } catch (error) {
        return { success: false, message: "Không thể cập nhật số lượng" };
      }
    },
    [getUserId],
  );

  const updateQuantity = useCallback(
    async ({ itemId, productId, variantId, amount }) => {
      const currentItem = cartItems.find((item) => {
        if (itemId) return String(item._id) === String(itemId);
        return (
          String(item.productId?._id || item.productId) === String(productId) &&
          String(item.variantId?._id || item.variantId) === String(variantId)
        );
      });

      if (!currentItem)
        return { success: false, message: "Không tìm thấy sản phẩm" };

      const nextQuantity = Math.max(
        1,
        Number(currentItem.quantity || 1) + Number(amount || 0),
      );
      return setQuantity({
        itemId: currentItem._id,
        productId:
          currentItem.productId?._id || currentItem.productId || productId,
        variantId:
          currentItem.variantId?._id || currentItem.variantId || variantId,
        quantity: nextQuantity,
      });
    },
    [cartItems, setQuantity],
  );

  const updateVariant = useCallback(
    async ({ itemId, productId, oldVariantId, newVariantId }) => {
      try {
        const userId = getUserId();

        if (!userId) {
          const current = readGuestCart();
          const targetItem = current.find((item) => {
            const matchById = itemId && String(item._id) === String(itemId);
            const matchByPair =
              String(item.productId) === String(productId) &&
              String(item.variantId) === String(oldVariantId);
            return matchById || matchByPair;
          });

          if (!targetItem)
            return { success: false, message: "Không tìm thấy sản phẩm" };

          const duplicateItem = current.find(
            (item) =>
              String(item._id) !== String(targetItem._id) &&
              String(item.productId) === String(targetItem.productId) &&
              String(item.variantId) === String(newVariantId),
          );

          let nextItems;
          if (duplicateItem) {
            nextItems = current
              .map((item) =>
                String(item._id) === String(duplicateItem._id)
                  ? {
                      ...item,
                      quantity:
                        Number(item.quantity || 0) +
                        Number(targetItem.quantity || 0),
                    }
                  : item,
              )
              .filter((item) => String(item._id) !== String(targetItem._id));
          } else {
            nextItems = current.map((item) => {
              const match =
                (itemId && String(item._id) === String(itemId)) ||
                (String(item.productId) === String(productId) &&
                  String(item.variantId) === String(oldVariantId));
              return match ? { ...item, variantId: newVariantId } : item;
            });
          }

          writeGuestCart(nextItems);
          setCartItems(nextItems);
          return { success: true, guest: true, items: nextItems };
        }

        const res = await updateCartVariantApi({
          userId,
          itemId,
          productId,
          oldVariantId,
          newVariantId,
        });
        setCartItems(normalizeCartItems(res));
        return { success: true, data: res };
      } catch (error) {
        return { success: false, message: "Không thể đổi phân loại" };
      }
    },
    [getUserId],
  );

  const clearCart = useCallback(async () => {
    try {
      const userId = getUserId();

      if (!userId) {
        writeGuestCart([]);
        setCartItems([]);
        return { success: true };
      }

      await clearCartApi(userId);
      setCartItems([]);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }, [getUserId]);

  // reset state khi logout, không xóa DB cart của tài khoản
  const resetCartState = useCallback(() => {
    const guestItems = readGuestCart();
    setCartItems(guestItems);
    return { success: true, items: guestItems };
  }, []);

  // xóa đúng các sản phẩm đã mua khỏi giỏ
  const removePurchasedItems = useCallback(
    async (itemsToRemove = []) => {
      try {
        const userId = getUserId();

        if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) {
          return { success: true };
        }

        if (!userId) {
          const nextItems = removeCheckedGuestCartItems(itemsToRemove);
          setCartItems(nextItems);
          return { success: true, guest: true, items: nextItems };
        }

        for (const item of itemsToRemove) {
          await removeCartItemApi({
            userId,
            itemId: item.itemId || item._id || "",
            productId: item.productId,
            variantId: item.variantId || "",
          });
        }

        await fetchCart();
        return { success: true };
      } catch (error) {
        console.error("removePurchasedItems error:", error);
        return {
          success: false,
          message: "Không thể xóa sản phẩm đã mua khỏi giỏ hàng",
        };
      }
    },
    [getUserId, fetchCart],
  );

  // merge guest cart vào user cart sau khi login
  const mergeGuestCartToUser = useCallback(async () => {
    try {
      const userId = getUserId();
      const guestItems = readGuestCart();

      if (!userId || !guestItems.length) {
        return { success: true };
      }

      for (const item of guestItems) {
        await addToCartApi({
          userId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: Number(item.quantity || 1),
        });
      }

      writeGuestCart([]);
      await fetchCart();

      return { success: true };
    } catch (error) {
      console.error("mergeGuestCartToUser error:", error);
      return {
        success: false,
        message: "Không thể đồng bộ giỏ hàng guest vào tài khoản",
      };
    }
  }, [getUserId, fetchCart]);

  useEffect(() => {
    const handleUserChange = async () => {
      await mergeGuestCartToUser();
      await fetchCart();
    };

    window.addEventListener("user-changed", handleUserChange);

    return () => {
      window.removeEventListener("user-changed", handleUserChange);
    };
  }, [fetchCart, mergeGuestCartToUser]);

  useEffect(() => {
    const handleCartUpdated = async () => {
      await fetchCart();
    };

    const handleGuestRemoveChecked = (event) => {
      const items = Array.isArray(event.detail?.items)
        ? event.detail.items
        : [];
      const nextItems = removeCheckedGuestCartItems(items);
      setCartItems(nextItems);
    };

    const handleLogoutCartReset = () => {
      resetCartState();
    };

    window.addEventListener("cart-updated", handleCartUpdated);
    window.addEventListener(
      "cart-remove-checked-guest",
      handleGuestRemoveChecked,
    );
    window.addEventListener("cart-reset-after-logout", handleLogoutCartReset);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
      window.removeEventListener(
        "cart-remove-checked-guest",
        handleGuestRemoveChecked,
      );
      window.removeEventListener(
        "cart-reset-after-logout",
        handleLogoutCartReset,
      );
    };
  }, [fetchCart, resetCartState]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems],
  );

  const value = useMemo(
    () => ({
      cartItems,
      cartLoading,
      totalItems,
      fetchCart,
      addToCart,
      removeFromCart,
      setQuantity,
      updateQuantity,
      updateVariant,
      clearCart,
      removePurchasedItems,
      mergeGuestCartToUser,
      resetCartState,
    }),
    [
      cartItems,
      cartLoading,
      totalItems,
      fetchCart,
      addToCart,
      removeFromCart,
      setQuantity,
      updateQuantity,
      updateVariant,
      clearCart,
      removePurchasedItems,
      mergeGuestCartToUser,
      resetCartState,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
