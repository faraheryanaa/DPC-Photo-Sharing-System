from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, and_
from app.storage import get_photo_url, delete_photo_from_s3

from app.database import get_db
from app.models import (
    User, Friendship, Group, GroupMember, Photo, Comment, PhotoShare
)
from app.schemas import (
    UserResponse,
    FriendRequestResponse,
    GroupCreate,
    GroupUpdate,
    GroupMemberAdd,
    GroupResponse,
    GroupDetailResponse
)
from app.security import get_current_user


router = APIRouter(
    prefix="/api",
    tags=["Friends & Groups"]
)


# ==========================================
# FRIENDS
# ==========================================

# GET FRIEND LIST
@router.get("/friends", response_model=list[UserResponse])
def get_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    friends = db.scalars(
        select(User)
        .join(
            Friendship,
            or_(
                and_(
                    Friendship.requester_id == current_user.id,
                    Friendship.receiver_id == User.id
                ),
                and_(
                    Friendship.receiver_id == current_user.id,
                    Friendship.requester_id == User.id
                )
            )
        )
        .where(Friendship.status == "accepted")
    ).all()

    return friends


# SEND FRIEND REQUEST
@router.post("/friends/{user_id}/request")
def send_friend_request(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot send a friend request to yourself"
        )

    target_user = db.get(User, user_id)

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    existing = db.scalar(
        select(Friendship).where(
            or_(
                and_(
                    Friendship.requester_id == current_user.id,
                    Friendship.receiver_id == user_id
                ),
                and_(
                    Friendship.requester_id == user_id,
                    Friendship.receiver_id == current_user.id
                )
            )
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A friendship request or friendship already exists"
        )

    friendship = Friendship(
        requester_id=current_user.id,
        receiver_id=user_id,
        status="pending"
    )

    db.add(friendship)
    db.commit()
    db.refresh(friendship)

    return {
        "message": "Friend request sent successfully",
        "friendship_id": friendship.id
    }


# VIEW RECEIVED FRIEND REQUESTS
@router.get("/friends/requests")
def get_friend_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    requests = db.execute(
        select(Friendship, User)
        .join(User, Friendship.requester_id == User.id)
        .where(
            Friendship.receiver_id == current_user.id,
            Friendship.status == "pending"
        )
    ).all()

    return [
        {
            "id": friendship.id,
            "requester": {
                "id": user.id,
                "username": user.username,
                "created_at": user.created_at
            },
            "created_at": friendship.created_at
        }
        for friendship, user in requests
    ]


# ACCEPT FRIEND REQUEST
@router.post("/friends/requests/{friendship_id}/accept")
def accept_friend_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    friendship = db.get(Friendship, friendship_id)

    if not friendship or friendship.receiver_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Friend request not found"
        )

    if friendship.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="This request has already been processed"
        )

    friendship.status = "accepted"

    db.commit()

    return {"message": "Friend request accepted successfully"}


# REMOVE FRIEND
@router.delete("/friends/{user_id}")
def remove_friend(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    friendship = db.scalar(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                and_(
                    Friendship.requester_id == current_user.id,
                    Friendship.receiver_id == user_id
                ),
                and_(
                    Friendship.requester_id == user_id,
                    Friendship.receiver_id == current_user.id
                )
            )
        )
    )

    if not friendship:
        raise HTTPException(
            status_code=404,
            detail="Friendship not found"
        )

    db.delete(friendship)
    db.commit()

    return {"message": "Friend removed successfully"}


# ==========================================
# GROUPS
# ==========================================

# CHECK GROUP MEMBERSHIP
def check_group_member(
    group_id: int,
    user_id: int,
    db: Session
):
    member = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        )
    )

    if not member:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )


# CHECK GROUP OWNER
def check_group_owner(
    group: Group,
    current_user: User
):
    if group.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the group creator can perform this action"
        )


# GET ALL USER GROUPS
@router.get("/groups", response_model=list[GroupResponse])
def get_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    groups = db.scalars(
        select(Group)
        .join(GroupMember, Group.id == GroupMember.group_id)
        .where(GroupMember.user_id == current_user.id)
    ).all()

    return groups


# CREATE GROUP
@router.post(
    "/groups",
    response_model=GroupResponse,
    status_code=status.HTTP_201_CREATED
)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_group = Group(
        name=group_data.name,
        created_by=current_user.id
    )

    db.add(new_group)
    db.flush()

    # Automatically add creator as a group member
    creator_membership = GroupMember(
        group_id=new_group.id,
        user_id=current_user.id
    )

    db.add(creator_membership)

    db.commit()
    db.refresh(new_group)

    return new_group


# GET GROUP DETAILS
@router.get(
    "/groups/{group_id}",
    response_model=GroupDetailResponse
)
def get_group_details(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    check_group_member(group_id, current_user.id, db)

    members = db.scalars(
        select(User)
        .join(GroupMember, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
    ).all()

    return {
        "id": group.id,
        "name": group.name,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "members": members
    }


# UPDATE GROUP NAME
@router.patch("/groups/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    group_data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    check_group_owner(group, current_user)

    group.name = group_data.name

    db.commit()
    db.refresh(group)

    return group


# ADD GROUP MEMBER
@router.post("/groups/{group_id}/members")
def add_group_member(
    group_id: int,
    member_data: GroupMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    check_group_owner(group, current_user)

    new_user = db.get(User, member_data.user_id)

    if not new_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Only accepted friends can be added
    friendship = db.scalar(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                and_(
                    Friendship.requester_id == current_user.id,
                    Friendship.receiver_id == member_data.user_id
                ),
                and_(
                    Friendship.requester_id == member_data.user_id,
                    Friendship.receiver_id == current_user.id
                )
            )
        )
    )

    if not friendship:
        raise HTTPException(
            status_code=403,
            detail="You can only add accepted friends to your group"
        )

    existing_member = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == member_data.user_id
        )
    )

    if existing_member:
        raise HTTPException(
            status_code=409,
            detail="User is already a group member"
        )

    membership = GroupMember(
        group_id=group_id,
        user_id=member_data.user_id
    )

    db.add(membership)
    db.commit()

    return {"message": "Member added successfully"}


# MEMBER LEAVES GROUP
@router.delete("/groups/{group_id}/members/me")
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    if group.created_by == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="The group creator cannot leave the group"
        )

    membership = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        )
    )

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="You are not a member of this group"
        )

    db.delete(membership)
    db.commit()

    return {"message": "You have left the group successfully"}


# REMOVE GROUP MEMBER
@router.delete("/groups/{group_id}/members/{user_id}")
def remove_group_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    check_group_owner(group, current_user)

    if user_id == group.created_by:
        raise HTTPException(
            status_code=400,
            detail="The group creator cannot be removed"
        )

    membership = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        )
    )

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Group member not found"
        )

    db.delete(membership)
    db.commit()

    return {"message": "Member removed successfully"}

# ==========================================
# DELETE GROUP
# ==========================================

@router.delete("/groups/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    # Only the group creator can delete the group.
    check_group_owner(group, current_user)

    try:

        # Get photo IDs and their S3 object keys.
        photo_records = db.query(Photo.id, Photo.image_url).filter(
            Photo.group_id == group_id
        ).all()

        photo_ids = [photo_id for photo_id, _ in photo_records]
        photo_keys = [image_url for _, image_url in photo_records]  

        # Remove comments and direct shares for these photos first.
        if photo_ids:
            db.query(Comment).filter(
                Comment.photo_id.in_(photo_ids)
            ).delete(synchronize_session=False)

            db.query(PhotoShare).filter(
                PhotoShare.photo_id.in_(photo_ids)
            ).delete(synchronize_session=False)

        # Remove photos and group memberships.
        db.query(Photo).filter(
            Photo.group_id == group_id
        ).delete(synchronize_session=False)

        db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).delete(synchronize_session=False)

        # Delete the group itself.
        db.delete(group)
        db.commit()
        # Delete the associated images from S3.
        for photo_key in photo_keys:
            delete_photo_from_s3(photo_key)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Group and its associated content deleted successfully"
    }


# ==========================================
# GET PHOTOS IN A GROUP
# ==========================================

@router.get("/groups/{group_id}/photos")
def get_group_photos(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check whether the group exists
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    # Check whether the user belongs to the group
    check_group_member(group_id, current_user.id, db)

    # Retrieve photos belonging to this group
    photos = db.scalars(
        select(Photo)
        .where(Photo.group_id == group_id)
        .order_by(Photo.uploaded_at.desc())
    ).all()

    return [
        {
            "id": photo.id,
            "user_id": photo.user_id,
            "group_id": photo.group_id,
            "image_url": get_photo_url(photo.image_url),
            "caption": photo.caption,
            "uploaded_at": photo.uploaded_at
        }
        for photo in photos
    ]