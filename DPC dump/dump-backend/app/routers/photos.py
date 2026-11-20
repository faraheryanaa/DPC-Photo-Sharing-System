from app.storage import (
    upload_photo_to_s3,
    get_photo_url,
    delete_photo_from_s3
)
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Photo, GroupMember, Comment, PhotoShare, Friendship
from app.security import get_current_user
from app.models import User


router = APIRouter(
    prefix="/api/photos",
    tags=["Photos"]
)



# ==========================================
# CHECK PHOTO ACCESS
# ==========================================

def can_access_photo(
    photo: Photo,
    user_id: int,
    db: Session
):
    # Photo owner always has access
    if photo.user_id == user_id:
        return True

    # Check group membership
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == photo.group_id,
        GroupMember.user_id == user_id
    ).first()

    if membership:
        return True

    # Check whether the photo was shared directly
    shared = db.query(PhotoShare).filter(
        PhotoShare.photo_id == photo.id,
        PhotoShare.shared_with_user_id == user_id
    ).first()

    return shared is not None


# ==========================================
# 1. UPLOAD PHOTO
# ==========================================

@router.post("/", status_code=201)
def upload_photo(
    group_id: int = Form(...),
    caption: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check file type
    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, GIF and WEBP images are allowed"
        )

    # Check group membership
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You must be a group member to upload photos"
        )

        # Generate a unique S3 object key
    extension = Path(file.filename).suffix.lower()

    if extension not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file extension"
        )

    object_key = f"photos/{uuid4().hex}{extension}"
    uploaded_to_s3 = False

    try:
        # Upload image to private S3 bucket
        upload_photo_to_s3(file.file, object_key, file.content_type)
        uploaded_to_s3 = True

        # Save photo information in PostgreSQL
        new_photo = Photo(
            user_id=current_user.id,
            group_id=group_id,
            image_url=object_key,
            caption=caption
        )

        db.add(new_photo)
        db.commit()
        db.refresh(new_photo)

        return {
            "message": "Photo uploaded successfully",
            "id": new_photo.id,
            "user_id": new_photo.user_id,
            "group_id": new_photo.group_id,
            "image_url": get_photo_url(object_key),
            "caption": new_photo.caption,
            "uploaded_at": new_photo.uploaded_at
        }

    except Exception:
        db.rollback()

        if uploaded_to_s3:
            try:
                delete_photo_from_s3(object_key)
            except Exception:
                pass

        raise HTTPException(
            status_code=500,
            detail="Photo upload failed"
        )

    finally:
        file.file.close()

    # Save image locally
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Save photo information in PostgreSQL
        new_photo = Photo(
            user_id=current_user.id,
            group_id=group_id,
            image_url=f"/uploads/{filename}",
            caption=caption
        )

        db.add(new_photo)
        db.commit()
        db.refresh(new_photo)

        return {
            "message": "Photo uploaded successfully",
            "id": new_photo.id,
            "user_id": new_photo.user_id,
            "group_id": new_photo.group_id,
            "image_url": new_photo.image_url,
            "caption": new_photo.caption,
            "uploaded_at": new_photo.uploaded_at
        }

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Photo upload failed"
        )

    finally:
        file.file.close()

        # ==========================================
# 2. ADD COMMENT TO PHOTO
# ==========================================

@router.post("/{photo_id}/comments", status_code=201)
def add_comment(
    photo_id: int,
    content: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether the photo exists
    photo = db.query(Photo).filter(
        Photo.id == photo_id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=404,
            detail="Photo not found"
        )

    # Check whether the user has access to the photo
    if not can_access_photo(photo, current_user.id, db):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to comment on this photo"
        )

    # Create a new comment
    new_comment = Comment(
        photo_id=photo_id,
        user_id=current_user.id,
        content=content
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return {
        "message": "Comment added successfully",
        "id": new_comment.id,
        "photo_id": new_comment.photo_id,
        "user_id": new_comment.user_id,
        "content": new_comment.content,
        "created_at": new_comment.created_at
    }

# ==========================================
# 3. GET COMMENTS FOR A PHOTO
# ==========================================

@router.get("/{photo_id}/comments")
def get_photo_comments(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether the photo exists
    photo = db.query(Photo).filter(
        Photo.id == photo_id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=404,
            detail="Photo not found"
        )

    # Check whether the user has access to the photo
    if not can_access_photo(photo, current_user.id, db):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view these comments"
        )

    # Retrieve comments for the photo
    comments = db.query(Comment).filter(
        Comment.photo_id == photo_id
    ).order_by(Comment.created_at.asc()).all()

    return [
        {
            "id": comment.id,
            "photo_id": comment.photo_id,
            "user_id": comment.user_id,
            "content": comment.content,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at
        }
        for comment in comments
    ]

    # ==========================================
# 4. EDIT A COMMENT
# ==========================================

@router.patch("/comments/{comment_id}")
def edit_comment(
    comment_id: int,
    content: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the comment
    comment = db.query(Comment).filter(
        Comment.id == comment_id
    ).first()

    if not comment:
        raise HTTPException(
            status_code=404,
            detail="Comment not found"
        )

    # Only the comment owner can edit it
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own comments"
        )

    # Update comment content
    comment.content = content

    db.commit()
    db.refresh(comment)

    return {
        "message": "Comment updated successfully",
        "id": comment.id,
        "photo_id": comment.photo_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "updated_at": comment.updated_at
    }

# ==========================================
# 5. DELETE A COMMENT
# ==========================================

@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the comment
    comment = db.query(Comment).filter(
        Comment.id == comment_id
    ).first()

    if not comment:
        raise HTTPException(
            status_code=404,
            detail="Comment not found"
        )

    # Only the comment owner can delete it
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own comments"
        )

    # Delete the comment
    db.delete(comment)
    db.commit()

    return {
        "message": "Comment deleted successfully",
        "id": comment_id
    }

    # ==========================================
# 6. DELETE A PHOTO
# ==========================================

@router.delete("/{photo_id}")
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the photo
    photo = db.query(Photo).filter(
        Photo.id == photo_id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=404,
            detail="Photo not found"
        )

    # Only the photo owner can delete it
    if photo.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own photos"
        )

        # Delete the image from S3
    try:
        delete_photo_from_s3(photo.image_url)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not delete photo from storage"
        )

    # Delete photo record from database
    db.delete(photo)
    db.commit()

    # Delete photo record from database
    db.delete(photo)
    db.commit()

    # Delete the actual image file
    if image_path.exists():
        image_path.unlink()

    return {
        "message": "Photo deleted successfully",
        "id": photo_id
    }

# ==========================================
# 7. UPDATE PHOTO CAPTION
# ==========================================

@router.patch("/{photo_id}")
def update_photo(
    photo_id: int,
    caption: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the photo
    photo = db.query(Photo).filter(
        Photo.id == photo_id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=404,
            detail="Photo not found"
        )

    # Only the photo owner can update it
    if photo.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own photos"
        )

    # Update the caption
    photo.caption = caption

    db.commit()
    db.refresh(photo)

    return {
        "message": "Photo caption updated successfully",
        "id": photo.id,
        "user_id": photo.user_id,
        "group_id": photo.group_id,
        "image_url": get_photo_url(photo.image_url),
        "caption": photo.caption,
        "uploaded_at": photo.uploaded_at
    }

# ==========================================
# 8. SHARE PHOTO WITH FRIENDS
# ==========================================

@router.post("/{photo_id}/shares", status_code=201)
def share_photo(
    photo_id: int,
    user_ids: list[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether the photo exists
    photo = db.query(Photo).filter(
        Photo.id == photo_id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=404,
            detail="Photo not found"
        )

    # Only the photo owner can share it
    if photo.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only share your own photos"
        )

    if not user_ids:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one friend"
        )

    shared_to = []
    already_shared = []

    for recipient_id in set(user_ids):

        # Prevent sharing with yourself
        if recipient_id == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="You cannot share a photo with yourself"
            )

        # Check whether the recipient exists
        recipient = db.query(User).filter(
            User.id == recipient_id
        ).first()

        if not recipient:
            raise HTTPException(
                status_code=404,
                detail=f"User {recipient_id} not found"
            )

        # Check whether they are accepted friends
        friendship = db.query(Friendship).filter(
            Friendship.requester_id == current_user.id,
            Friendship.receiver_id == recipient_id,
            Friendship.status == "accepted"
        ).first()

        if not friendship:
            friendship = db.query(Friendship).filter(
                Friendship.requester_id == recipient_id,
                Friendship.receiver_id == current_user.id,
                Friendship.status == "accepted"
            ).first()

        if not friendship:
            raise HTTPException(
                status_code=403,
                detail=f"User {recipient_id} is not your accepted friend"
            )

        # Check whether the photo was already shared
        existing_share = db.query(PhotoShare).filter(
            PhotoShare.photo_id == photo_id,
            PhotoShare.shared_with_user_id == recipient_id
        ).first()

        if existing_share:
            already_shared.append(recipient_id)
            continue

        # Create the sharing record
        new_share = PhotoShare(
            photo_id=photo_id,
            shared_with_user_id=recipient_id
        )

        db.add(new_share)
        shared_to.append(recipient_id)

    db.commit()

    return {
        "message": "Photo sharing completed successfully",
        "photo_id": photo_id,
        "shared_to": shared_to,
        "already_shared": already_shared
    }

# ==========================================
# GET PHOTOS SHARED WITH CURRENT USER
# ==========================================

@router.get("/shared-with-me")
def get_shared_photos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shared_photos = (
        db.query(Photo, PhotoShare.shared_at)
        .join(PhotoShare, Photo.id == PhotoShare.photo_id)
        .filter(
            PhotoShare.shared_with_user_id == current_user.id
        )
        .order_by(PhotoShare.shared_at.desc())
        .all()
    )

    return [
        {
            "id": photo.id,
            "user_id": photo.user_id,
            "group_id": photo.group_id,
            "image_url": get_photo_url(photo.image_url),
            "caption": photo.caption,
            "uploaded_at": photo.uploaded_at,
            "shared_at": shared_at
        }
        for photo, shared_at in shared_photos
    ]